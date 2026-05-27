import type { IpcMainInvokeEvent, BrowserWindow } from 'electron'
import { createLogger } from '../../log'
import type { WorkflowRunPayload, WorkflowRunResult } from '../../../shared/workflow'
import { runWorkflow, requestStop, isWorkflowRunning } from '../../workflow/executor'

const logger = createLogger('ipc:workflow')

export function createWorkflowHandlers(getMainWindow: () => BrowserWindow | null) {
  async function handleWorkflowRun(
    _event: IpcMainInvokeEvent,
    payload: WorkflowRunPayload
  ): Promise<WorkflowRunResult> {
    if (isWorkflowRunning()) {
      return { ok: false, error: '已有工作流正在运行' }
    }

    const win = getMainWindow()
    if (!win) {
      return { ok: false, error: '主窗口不可用' }
    }

    const { workflow, deviceId } = payload
    if (!workflow || !deviceId) {
      return { ok: false, error: '参数缺失: workflow 或 deviceId' }
    }

    logger.info('workflow run requested', { id: workflow.id, deviceId })

    // 异步执行，立即返回 ok
    void runWorkflow(workflow, deviceId, win)

    return { ok: true }
  }

  function handleWorkflowStop(): void {
    logger.info('workflow stop requested')
    requestStop()
  }

  return { handleWorkflowRun, handleWorkflowStop }
}
