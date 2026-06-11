import type { IpcMainInvokeEvent, BrowserWindow } from 'electron'
import { createLogger } from '../../log'
import type { WorkflowRunPayload, WorkflowRunResult, WorkflowNode } from '../../../shared/workflow'
import { runWorkflow, runSingleNode, requestStop, isWorkflowRunning } from '../../workflow/executor'
import { isAgentRunning } from '../../agent/executor'

const logger = createLogger('ipc:workflow')

export function createWorkflowHandlers(getMainWindow: () => BrowserWindow | null) {
  async function handleWorkflowRun(
    _event: IpcMainInvokeEvent,
    payload: WorkflowRunPayload
  ): Promise<WorkflowRunResult> {
    if (isWorkflowRunning() || isAgentRunning()) {
      return { ok: false, error: '已有任务正在运行' }
    }

    const win = getMainWindow()
    if (!win) {
      return { ok: false, error: '主窗口不可用' }
    }

    const { workflow, deviceId, baseUrl } = payload
    if (!workflow) {
      return { ok: false, error: '参数缺失: workflow' }
    }

    logger.info('workflow run requested', { id: workflow.id, deviceId })

    void runWorkflow(workflow, deviceId, win, baseUrl)

    return { ok: true }
  }

  async function handleWorkflowRunNode(
    _event: IpcMainInvokeEvent,
    payload: { node: WorkflowNode; deviceId?: string; baseUrl?: string }
  ): Promise<WorkflowRunResult> {
    if (isWorkflowRunning() || isAgentRunning()) {
      return { ok: false, error: '已有任务正在运行' }
    }
    const win = getMainWindow()
    if (!win) return { ok: false, error: '主窗口不可用' }
    const { node, deviceId, baseUrl } = payload
    logger.info('single node run requested', { nodeId: node.id, type: node.type })
    void runSingleNode(node, deviceId, win, baseUrl)
    return { ok: true }
  }

  function handleWorkflowStop(): void {
    logger.info('workflow stop requested')
    requestStop()
  }

  return { handleWorkflowRun, handleWorkflowRunNode, handleWorkflowStop }
}
