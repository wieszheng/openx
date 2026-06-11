import { nanoid } from 'nanoid'
import type { PlanStep, PlanThinkEmitter, StepAssertion, WorkflowDraft } from '../../../shared/agent'
import type { WorkflowEdge, WorkflowNode } from '../../../shared/workflow'
import { DEFAULT_NODE_PARAMS } from '../../../shared/workflow-defaults'

const COL = 280
const START_X = 120
const START_Y = 220

export interface PlanStepAppliedPayload {
  stepIndex: number
  totalSteps: number
  step: PlanStep
  node: WorkflowNode
  edge: WorkflowEdge
}

const NODE_REASON: Record<string, string> = {
  'action-find-and-tap': 'OCR 文字定位，适配不同分辨率',
  'action-launch-app': '启动目标应用',
  'action-input-text': '向焦点控件输入文本',
  'control-delay': '等待页面渲染/动画完成',
  'action-key-event': '发送系统按键',
  'action-swipe': '滑动手势',
  'action-screenshot': '截取屏幕状态',
}

function describeParams(step: PlanStep): string[] {
  const p = step.params as Record<string, unknown>
  const lines: string[] = []
  if (p.targetText) lines.push(`目标文字「${p.targetText}」· 匹配 ${p.matchType ?? 'contains'}`)
  if (p.action && p.action !== 'tap') lines.push(`找到后执行: ${p.action}`)
  if (p.packageName) lines.push(`包名: ${p.packageName || '(待填)'}`)
  if (p.text) lines.push(`输入内容: ${p.text}`)
  if (p.ms) lines.push(`等待 ${p.ms}ms`)
  if (p.keyCode) lines.push(`按键码: ${p.keyCode}`)
  return lines
}

export function emitStepThink(think: PlanThinkEmitter | undefined, step: PlanStep, index: number, total: number): void {
  think?.({ kind: 'info', message: `◆ [${index + 1}/${total}] ${step.label}` })
  think?.({ kind: 'info', message: `    意图: ${step.intent}` })
  think?.({ kind: 'info', message: `    策略: ${NODE_REASON[step.type] ?? step.type}` })
  for (const line of describeParams(step)) {
    think?.({ kind: 'info', message: `    ${line}` })
  }
  if (step.postDelayMs) {
    think?.({ kind: 'info', message: `    执行后延迟 ${step.postDelayMs}ms` })
  }
  if (step.assertions?.length) {
    think?.({ kind: 'info', message: `    附加断言 ${step.assertions.length} 条` })
  }
}

export class StreamingWorkflowBuilder {
  private readonly workflowId = nanoid()
  private readonly triggerId = nanoid()
  private readonly nodes: WorkflowNode[] = []
  private readonly edges: WorkflowEdge[] = []
  private readonly steps: PlanStep[] = []
  private readonly stepAssertions: Record<string, StepAssertion[]> = {}
  private prevId: string
  private readonly createdAt = Date.now()
  private readonly workflowName: string
  private readonly workflowDescription: string

  constructor(name: string, description: string) {
    this.workflowName = name
    this.workflowDescription = description
    const trigger: WorkflowNode = {
      id: this.triggerId,
      type: 'trigger-manual',
      label: '手动触发',
      params: {},
      position: { x: START_X, y: START_Y },
    }
    this.nodes.push(trigger)
    this.prevId = this.triggerId
  }

  get edgeCount(): number {
    return this.edges.length
  }

  get workflowIdValue(): string {
    return this.workflowId
  }

  getTriggerNode(): WorkflowNode {
    return this.nodes[0]!
  }

  async addStep(
    step: PlanStep,
    onStep?: (payload: PlanStepAppliedPayload) => void | Promise<void>,
    think?: PlanThinkEmitter
  ): Promise<PlanStepAppliedPayload> {
    const stepIndex = this.steps.length
    this.steps.push(step)

    const nodeId = nanoid()
    const params = {
      ...(DEFAULT_NODE_PARAMS[step.type] ?? {}),
      ...(step.params as Record<string, unknown>),
    }

    const node: WorkflowNode = {
      id: nodeId,
      type: step.type,
      label: step.label,
      params: params as WorkflowNode['params'],
      position: { x: START_X + (stepIndex + 1) * COL, y: START_Y },
      postDelayMs: step.postDelayMs ?? (step.type.startsWith('trigger-') ? undefined : 2000),
    }

    const edge: WorkflowEdge = {
      id: nanoid(),
      source: this.prevId,
      target: nodeId,
    }

    this.nodes.push(node)
    this.edges.push(edge)
    if (step.assertions?.length) {
      this.stepAssertions[nodeId] = step.assertions
    }
    this.prevId = nodeId

    const payload: PlanStepAppliedPayload = {
      stepIndex,
      totalSteps: stepIndex + 1,
      step,
      node,
      edge,
    }

    emitStepThink(think, step, stepIndex, stepIndex + 1)
    think?.({ kind: 'info', message: `    → 写入画布节点 #${stepIndex + 1} (${node.position.x}, ${node.position.y})` })

    if (onStep) await onStep(payload)

    return payload
  }

  finalize(meta: {
    assumptions: string[]
    uncertainties: WorkflowDraft['uncertainties']
    plannerSource: WorkflowDraft['plannerSource']
    acceptanceCriteria?: StepAssertion[]
  }): WorkflowDraft {
    const workflow = {
      id: this.workflowId,
      name: this.workflowName,
      description: this.workflowDescription,
      nodes: this.nodes,
      edges: this.edges,
      createdAt: this.createdAt,
      updatedAt: Date.now(),
    }

    return {
      name: this.workflowName,
      description: this.workflowDescription,
      workflow,
      steps: this.steps,
      stepAssertions: this.stepAssertions,
      acceptanceCriteria: meta.acceptanceCriteria ?? [],
      assumptions: meta.assumptions,
      uncertainties: meta.uncertainties,
      plannerSource: meta.plannerSource,
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
