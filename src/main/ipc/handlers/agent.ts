import type { IpcMainInvokeEvent, BrowserWindow } from 'electron'
import type {
  AgentApplyRepairPayload,
  AgentApplyRepairResult,
  AgentPlanPayload,
  AgentPlanResult,
  AgentRunResult,
  AgentStartPayload,
} from '../../../shared/agent'
import { createLogger } from '../../log'
import { isWorkflowRunning } from '../../workflow/executor'
import { isAgentRunning } from '../../agent/executor'
import {
  applyAgentRepair,
  getAgentSessionSnapshot,
  pauseAgentSession,
  planAgentWorkflow,
  resumeAgentSession,
  startAgentSession,
  stepAgentSession,
  stopAgentSession,
} from '../../agent/orchestrator'

const logger = createLogger('ipc:agent')

export function createAgentHandlers(getMainWindow: () => BrowserWindow | null) {
  async function handleAgentStart(
    _event: IpcMainInvokeEvent,
    payload: AgentStartPayload
  ): Promise<AgentRunResult> {
    if (isWorkflowRunning()) {
      return { ok: false, error: '工作流正在运行，请先停止' }
    }
    if (isAgentRunning()) {
      return { ok: false, error: 'Agent 已在运行' }
    }

    const win = getMainWindow()
    if (!win) return { ok: false, error: '主窗口不可用' }
    if (!payload?.workflow) return { ok: false, error: '参数缺失: workflow' }

    logger.info('agent start', { workflowId: payload.workflow.id, mode: payload.mode })
    return startAgentSession(payload, win)
  }

  function handleAgentPause(): AgentRunResult {
    logger.info('agent pause')
    return pauseAgentSession()
  }

  function handleAgentResume(): AgentRunResult {
    logger.info('agent resume')
    return resumeAgentSession()
  }

  function handleAgentStep(): AgentRunResult {
    logger.info('agent step')
    return stepAgentSession()
  }

  function handleAgentStop(): void {
    logger.info('agent stop')
    stopAgentSession()
  }

  function handleAgentGetSession(): ReturnType<typeof getAgentSessionSnapshot> {
    return getAgentSessionSnapshot()
  }

  async function handleAgentPlan(
    _event: IpcMainInvokeEvent,
    payload: AgentPlanPayload
  ): Promise<AgentPlanResult> {
    const win = getMainWindow()
    if (!win) return { ok: false, error: '主窗口不可用' }
    if (!payload?.intent?.description?.trim()) {
      return { ok: false, error: '请输入用例描述' }
    }
    logger.info('agent plan', { description: payload.intent.description.slice(0, 80) })
    return planAgentWorkflow(payload.intent, win)
  }

  function handleAgentApplyRepair(
    _event: IpcMainInvokeEvent,
    payload: AgentApplyRepairPayload
  ): AgentApplyRepairResult {
    logger.info('agent apply repair', { patches: payload?.proposal?.patches?.length })
    return applyAgentRepair(payload)
  }

  return {
    handleAgentStart,
    handleAgentPause,
    handleAgentResume,
    handleAgentStep,
    handleAgentStop,
    handleAgentGetSession,
    handleAgentPlan,
    handleAgentApplyRepair,
  }
}
