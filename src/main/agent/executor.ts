import type { BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import type {
  AgentEvent,
  AgentRunMode,
  AgentRunSummary,
  AgentStartPayload,
  Checkpoint,
  StepAssertion,
} from '../../shared/agent'
import { allAssertionsPassed, evaluateAssertions } from './asserter'
import type { WorkflowNode } from '../../shared/workflow'
import { createLogger } from '../log'
import {
  executeWorkflowNode,
  isWorkflowRunning,
  type WorkflowAdjEntry,
} from '../workflow/executor'
import { captureCheckpoint } from './checkpoint'
import {
  applyPatchesToWorkflow,
  buildFailureReport,
  proposeRepair,
  syncNodesMap,
} from './repairer'
import { updateAgentSnapshotFromEvent } from './session'
import type { Workflow } from '../../shared/workflow'

const logger = createLogger('agent:executor')

// ── Runtime state ─────────────────────────────────────────────────────────

let agentRunning = false
let stopRequested = false
let paused = false
let runMode: AgentRunMode = 'auto'
let stepGate: (() => void) | null = null
let breakpoints = new Set<string>()

export function isAgentRunning(): boolean {
  return agentRunning
}

function pushEvent(win: BrowserWindow, event: AgentEvent): void {
  updateAgentSnapshotFromEvent(event)
  if (!win.isDestroyed()) {
    win.webContents.send(IPC.agent.event, event)
  }
}

async function waitForContinue(nodeId: string, reason: 'debug' | 'breakpoint' | 'failure' | 'user', win: BrowserWindow): Promise<void> {
  paused = true
  pushEvent(win, { type: 'paused', nodeId, reason })
  pushEvent(win, { type: 'status', status: 'paused', mode: runMode })
  await new Promise<void>((resolve) => {
    stepGate = resolve
  })
}

function releaseGate(): void {
  if (stepGate) {
    stepGate()
    stepGate = null
  }
}

export function agentPause(): void {
  if (!agentRunning) return
  paused = true
}

export function agentResume(): void {
  if (!agentRunning) return
  runMode = 'auto'
  paused = false
  releaseGate()
}

export function agentStep(): void {
  if (!agentRunning) return
  paused = false
  releaseGate()
}

export function agentStop(): void {
  stopRequested = true
  paused = false
  releaseGate()
}

async function maybeWait(
  node: WorkflowNode,
  win: BrowserWindow,
  afterStep: boolean
): Promise<void> {
  if (stopRequested) return

  const isBreakpoint = breakpoints.has(node.id)
  const shouldPause =
    isBreakpoint ||
    (afterStep && runMode === 'debug')

  if (shouldPause) {
    const reason = isBreakpoint ? 'breakpoint' : 'debug'
    await waitForContinue(node.id, reason, win)
  } else if (paused) {
    await waitForContinue(node.id, 'user', win)
  }
}

async function runStepAssertions(
  node: WorkflowNode,
  checkpoint: Checkpoint,
  stepAssertions: Record<string, StepAssertion[]>,
  deviceId: string | undefined,
  ctx: Record<string, string>,
  baseUrl: string,
  win: BrowserWindow
): Promise<{ ok: boolean; failedNodeId?: string }> {
  const rules = stepAssertions[node.id]
  if (!rules?.length) return { ok: true }

  const results = await evaluateAssertions(rules, checkpoint, ctx, deviceId, baseUrl)
  pushEvent(win, { type: 'assertion_result', nodeId: node.id, results })

  if (!allAssertionsPassed(results)) {
    checkpoint.ok = false
    checkpoint.output = `断言失败: ${results.filter((r) => !r.ok).map((r) => r.expected).join('; ')}`
    pushEvent(win, { type: 'paused', nodeId: node.id, reason: 'assertion' })
    return { ok: false, failedNodeId: node.id }
  }
  return { ok: true }
}

async function traverseFrom(
  nodeId: string,
  nodes: Map<string, WorkflowNode>,
  adj: Map<string, WorkflowAdjEntry[]>,
  deviceId: string | undefined,
  ctx: Record<string, string>,
  baseUrl: string,
  win: BrowserWindow,
  checkpoints: Checkpoint[],
  completedNodeIds: string[],
  stepAssertions: Record<string, StepAssertion[]>,
  loopCount?: number
): Promise<{ ok: boolean; failedNodeId?: string }> {
  if (stopRequested) return { ok: false }

  const node = nodes.get(nodeId)
  if (!node) return { ok: true }

  await maybeWait(node, win, false)
  if (stopRequested) return { ok: false }

  pushEvent(win, {
    type: 'step_start',
    nodeId: node.id,
    nodeLabel: node.label,
    nodeType: node.type,
  })

  const startTime = Date.now()
  let result: { ok: boolean; output?: string; branchHandle?: string; imageData?: string }
  try {
    result = await executeWorkflowNode(node, deviceId, ctx)
    if (result.ok && node.postDelayMs && node.postDelayMs > 0 && !stopRequested) {
      await new Promise((res) => setTimeout(res, node.postDelayMs))
    }
  } catch (e) {
    result = { ok: false, output: e instanceof Error ? e.message : String(e) }
  }

  const duration = Date.now() - startTime
  const skipOcr = node.type === 'action-screenshot' || node.type === 'control-delay'
  const checkpoint = await captureCheckpoint(
    node,
    deviceId,
    baseUrl,
    result.ok,
    result.output,
    duration,
    skipOcr
  )
  if (result.imageData && !checkpoint.screenshotBase64) {
    const b64 = result.imageData.replace(/^data:image\/\w+;base64,/, '')
    checkpoint.screenshotBase64 = b64
    checkpoint.screenshotMime = 'image/png'
  }

  checkpoints.push(checkpoint)
  completedNodeIds.push(node.id)
  pushEvent(win, { type: 'step_end', checkpoint })

  if (!result.ok) {
    pushEvent(win, { type: 'paused', nodeId: node.id, reason: 'failure' })
    return { ok: false, failedNodeId: node.id }
  }

  const assertResult = await runStepAssertions(node, checkpoint, stepAssertions, deviceId, ctx, baseUrl, win)
  if (!assertResult.ok) return assertResult

  if (stopRequested) return { ok: false }

  await maybeWait(node, win, true)
  if (stopRequested) return { ok: false }

  const nexts = adj.get(nodeId) ?? []

  if (node.type === 'control-if') {
    const branchHandle = result.branchHandle ?? 'yes'
    const target = nexts.find((n) => n.sourceHandle === branchHandle) ?? nexts[0]
    if (target) {
      return traverseFrom(target.targetId, nodes, adj, deviceId, ctx, baseUrl, win, checkpoints, completedNodeIds, stepAssertions)
    }
    return { ok: true }
  }

  if (node.type === 'control-loop') {
    const count = loopCount ?? Number((node.params as { count?: number }).count ?? 1)
    const bodyTarget = nexts.find((n) => n.sourceHandle === 'loop-body') ?? nexts[0]
    const doneTarget = nexts.find((n) => n.sourceHandle === 'loop-done')

    if (bodyTarget) {
      for (let i = 0; i < count; i++) {
        if (stopRequested) return { ok: false }
        ctx['__loopIndex'] = String(i)
        const r = await traverseFrom(bodyTarget.targetId, nodes, adj, deviceId, ctx, baseUrl, win, checkpoints, completedNodeIds, stepAssertions)
        if (!r.ok) return r
      }
    }
    if (doneTarget && !stopRequested) {
      return traverseFrom(doneTarget.targetId, nodes, adj, deviceId, ctx, baseUrl, win, checkpoints, completedNodeIds, stepAssertions)
    }
    return { ok: true }
  }

  for (const next of nexts) {
    if (stopRequested) return { ok: false }
    const r = await traverseFrom(next.targetId, nodes, adj, deviceId, ctx, baseUrl, win, checkpoints, completedNodeIds, stepAssertions)
    if (!r.ok) return r
  }

  return { ok: true }
}

export async function runAgentWorkflow(
  payload: AgentStartPayload,
  win: BrowserWindow
): Promise<void> {
  if (agentRunning || isWorkflowRunning()) {
    logger.warn('agent or workflow already running')
    pushEvent(win, { type: 'error', message: '已有任务正在运行' })
    return
  }

  const {
    workflow: initialWorkflow, deviceId, baseUrl = 'http://127.0.0.1:8000', mode = 'auto',
    breakpoints: bp, fromNodeId, stepAssertions = {}, acceptanceCriteria = [],
    autoRepair = mode === 'auto', maxRepairAttempts = 3,
  } = payload

  agentRunning = true
  stopRequested = false
  paused = false
  runMode = mode
  breakpoints = new Set(bp ?? [])

  const startTime = Date.now()
  const checkpoints: Checkpoint[] = []
  const completedNodeIds: string[] = []

  pushEvent(win, { type: 'status', status: 'running', mode: runMode })

  let currentWorkflow: Workflow = {
    ...initialWorkflow,
    nodes: initialWorkflow.nodes.map((n) => ({ ...n, params: { ...n.params } })),
    edges: [...initialWorkflow.edges],
  }

  logger.info('agent run started', { workflowId: currentWorkflow.id, mode: runMode, deviceId, autoRepair })

  const nodes = new Map<string, WorkflowNode>()
  const adj = new Map<string, WorkflowAdjEntry[]>()
  syncNodesMap(currentWorkflow, nodes, adj)
  const ctx: Record<string, string> = { __baseUrl: baseUrl }

  const triggers = currentWorkflow.nodes.filter((n) => n.type.startsWith('trigger-'))
  if (triggers.length === 0) {
    pushEvent(win, { type: 'error', message: '工作流中没有触发器节点' })
    pushEvent(win, {
      type: 'done',
      summary: { totalSteps: 0, successSteps: 0, failedSteps: 0, duration: 0, status: 'failed' },
    })
    agentRunning = false
    return
  }

  let finalOk = true
  let failedNodeId: string | undefined
  let repairAttempts = 0
  let resumeNodeId: string | undefined = fromNodeId

  try {
    while (!stopRequested) {
      const entryIds = resumeNodeId ? [resumeNodeId] : triggers.map((t) => t.id)
      let traversalOk = true

      for (const entryId of entryIds) {
        if (stopRequested) break
        if (!nodes.has(entryId)) {
          finalOk = false
          pushEvent(win, { type: 'error', message: `节点不存在: ${entryId}` })
          traversalOk = false
          break
        }
        const r = await traverseFrom(
          entryId, nodes, adj, deviceId, ctx, baseUrl, win, checkpoints, completedNodeIds, stepAssertions
        )
        if (!r.ok) {
          finalOk = false
          failedNodeId = r.failedNodeId
          traversalOk = false
          break
        }
      }

      if (stopRequested) break

      if (traversalOk) {
        finalOk = true
        failedNodeId = undefined
        break
      }

      if (!failedNodeId || !autoRepair || repairAttempts >= maxRepairAttempts) break

      const failedNode = nodes.get(failedNodeId)
      const failedCp = [...checkpoints].reverse().find((c) => c.nodeId === failedNodeId && !c.ok)
      if (!failedNode || !failedCp) break

      const isAssertion = (failedCp.output ?? '').startsWith('断言失败')
      const failure = buildFailureReport(failedNode, failedCp, isAssertion)
      pushEvent(win, { type: 'repair_start', failure })

      const proposal = proposeRepair(failure, failedNode, currentWorkflow, isAssertion)
      if (!proposal?.autoApplicable || proposal.patches.length === 0) {
        pushEvent(win, { type: 'repair_failed', failure, reason: '无法自动生成修复方案' })
        break
      }

      pushEvent(win, { type: 'repair_proposal', proposal })
      currentWorkflow = applyPatchesToWorkflow(currentWorkflow, proposal.patches)
      syncNodesMap(currentWorkflow, nodes, adj)
      pushEvent(win, { type: 'repair_applied', proposal, workflow: currentWorkflow })
      pushEvent(win, { type: 'workflow_patched', workflow: currentWorkflow, patches: proposal.patches })

      repairAttempts++
      resumeNodeId = failedNodeId
      logger.info('agent repair applied', { attempt: repairAttempts, nodeId: failedNodeId, patches: proposal.patches.length })
    }

    if (finalOk && acceptanceCriteria.length > 0 && !stopRequested) {
      const lastCp = checkpoints[checkpoints.length - 1]
      const fakeCp: Checkpoint = lastCp ?? {
        nodeId: '__acceptance__',
        nodeLabel: '用例验收',
        nodeType: 'trigger-manual',
        timestamp: Date.now(),
        ok: true,
      }
      const results = await evaluateAssertions(acceptanceCriteria, fakeCp, ctx, deviceId, baseUrl)
      pushEvent(win, { type: 'assertion_result', nodeId: '__acceptance__', results })
      if (!allAssertionsPassed(results)) {
        finalOk = false
        pushEvent(win, { type: 'paused', reason: 'assertion' })
      }
    }
  } catch (e) {
    finalOk = false
    const msg = e instanceof Error ? e.message : String(e)
    logger.error('agent run error', { error: msg })
    pushEvent(win, { type: 'error', message: msg })
  }

  const successSteps = checkpoints.filter((c) => c.ok).length
  const failedSteps = checkpoints.filter((c) => !c.ok).length
  const status = stopRequested ? 'stopped' : finalOk ? 'done' : 'failed'

  const summary: AgentRunSummary = {
    totalSteps: checkpoints.length,
    successSteps,
    failedSteps,
    duration: Date.now() - startTime,
    failedNodeId,
    repairAttempts,
    status,
  }

  pushEvent(win, { type: 'done', summary })
  pushEvent(win, { type: 'status', status: stopRequested ? 'stopped' : finalOk ? 'done' : 'failed' })

  agentRunning = false
  stopRequested = false
  paused = false
  stepGate = null
  breakpoints = new Set()

  logger.info('agent run finished', summary)
}
