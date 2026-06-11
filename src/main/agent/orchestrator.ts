import type { BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import type { AgentIntent, AgentPlanResult, AgentRunResult, AgentStartPayload } from '../../shared/agent'
import { planWorkflow } from './planner'
import { applyPatchesToWorkflow } from './repairer'
import type { AgentApplyRepairPayload, AgentApplyRepairResult } from '../../shared/agent'
import {
  agentPause,
  agentResume,
  agentStep,
  agentStop,
  isAgentRunning,
  runAgentWorkflow,
} from './executor'
import { markAgentStopped, resetAgentSession } from './session'

export { getAgentSessionSnapshot, updateAgentSnapshotFromEvent } from './session'

export async function startAgentSession(
  payload: AgentStartPayload,
  win: BrowserWindow
): Promise<AgentRunResult> {
  if (isAgentRunning()) {
    return { ok: false, error: 'Agent 已在运行' }
  }

  resetAgentSession({
    workflowId: payload.workflow.id,
    workflowName: payload.workflow.name,
    deviceId: payload.deviceId,
    mode: payload.mode ?? 'auto',
  })

  void runAgentWorkflow(payload, win)

  return { ok: true }
}

export function pauseAgentSession(): AgentRunResult {
  if (!isAgentRunning()) return { ok: false, error: 'Agent 未在运行' }
  agentPause()
  return { ok: true }
}

export function resumeAgentSession(): AgentRunResult {
  if (!isAgentRunning()) return { ok: false, error: 'Agent 未在运行' }
  agentResume()
  return { ok: true }
}

export function stepAgentSession(): AgentRunResult {
  if (!isAgentRunning()) return { ok: false, error: 'Agent 未在运行' }
  agentStep()
  return { ok: true }
}

export function stopAgentSession(): void {
  agentStop()
  markAgentStopped()
}

export function applyAgentRepair(payload: AgentApplyRepairPayload): AgentApplyRepairResult {
  if (!payload?.workflow || !payload?.proposal?.patches?.length) {
    return { ok: false, error: '参数缺失' }
  }
  const workflow = applyPatchesToWorkflow(payload.workflow, payload.proposal.patches)
  return { ok: true, workflow }
}

export async function planAgentWorkflow(
  intent: AgentIntent,
  win: BrowserWindow
): Promise<AgentPlanResult> {
  if (isAgentRunning()) {
    return { ok: false, error: 'Agent 正在执行，请先停止' }
  }

  try {
    win.webContents.send(IPC.agent.event, { type: 'plan_start' })

    const draft = await planWorkflow(intent, {
      think: (payload) => {
        win.webContents.send(IPC.agent.event, { type: 'plan_think', ...payload })
      },
      onStreamInit: (init) => {
        win.webContents.send(IPC.agent.event, { type: 'plan_stream_init', ...init })
      },
      onStepApplied: (step) => {
        win.webContents.send(IPC.agent.event, { type: 'plan_step_applied', ...step })
      },
    })

    win.webContents.send(IPC.agent.event, { type: 'plan_done', draft })
    return { ok: true, draft }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    win.webContents.send(IPC.agent.event, { type: 'plan_error', message: msg })
    return { ok: false, error: msg }
  }
}
