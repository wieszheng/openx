/**
 * TaskRunner - 顺序执行引擎
 *
 * 对标 Midscene 的 TaskRunner，负责：
 * - 顺序执行 ExecutionTask 队列
 * - 管理任务状态（pending → running → finished/failed）
 * - 通过 ToolRegistry 执行具体工具
 * - 失败时取消后续任务
 * - 将执行结果实时通过 yield 推送给上层
 */

import type { ExecutionTask, AgentEvent, ToolResult } from './types'
import type { ToolRegistry } from '../tools/registry'
import type { ToolContext } from '../tools/tool-types'

/** TaskRunner 执行选项 */
export interface TaskRunnerOptions {
  /** 工具注册中心 */
  toolRegistry: ToolRegistry
  /** 工具执行上下文 */
  toolContext: ToolContext
  /** 任务间延迟毫秒数（默认 300） */
  delayBetweenTasks?: number
}

/**
 * 顺序执行任务队列
 *
 * 逐个执行任务，每个任务通过 ToolRegistry 调用对应工具。
 * 失败时中断执行，后续任务标记为 cancelled。
 *
 * @param tasks - 任务列表（会被原地修改状态）
 * @param options - 执行选项
 * @yields AgentEvent - 执行过程中的状态事件
 */
export async function* runTasks(
  tasks: ExecutionTask[],
  options: TaskRunnerOptions,
): AsyncGenerator<AgentEvent> {
  const { toolRegistry, toolContext, delayBetweenTasks = 300 } = options

  for (const task of tasks) {
    if (toolContext.signal.aborted) {
      task.status = 'cancelled'
      continue
    }

    // 标记为 running
    task.status = 'running'
    yield { type: 'task:start', task }

    // 通知 UI 工具调用开始（更新 pending → running 视觉状态）
    if (task.toolCallId) {
      yield {
        type: 'tool:call',
        toolCallId: task.toolCallId,
        toolName: task.actionType,
        arguments: JSON.stringify(task.params),
      }
    }

    // 执行工具
    const result = await executeTask(task, toolRegistry, toolContext)

    // 通知 UI 工具调用结果（更新 pending → success/error）
    if (task.toolCallId) {
      yield { type: 'tool:result', toolCallId: task.toolCallId, result }
    }

    if (result.success) {
      task.status = 'finished'
      yield { type: 'task:complete', taskId: task.id, result }
    } else {
      task.status = 'failed'
      yield { type: 'task:failed', taskId: task.id, error: result.error || '执行失败' }

      // 取消后续任务
      cancelRemainingTasks(tasks, tasks.indexOf(task))
      break
    }

    // 任务间延迟
    if (delayBetweenTasks > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenTasks))
    }
  }
}

/**
 * 执行单个任务
 *
 * @param task - 要执行的任务
 * @param registry - 工具注册中心
 * @param context - 工具执行上下文
 * @returns 任务执行结果
 */
async function executeTask(
  task: ExecutionTask,
  registry: ToolRegistry,
  context: ToolContext,
): Promise<ToolResult> {
  try {
    const result = await registry.execute(task.actionType, JSON.stringify(task.params), context)
    return result
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

/**
 * 取消指定任务之后的所有任务
 */
function cancelRemainingTasks(tasks: ExecutionTask[], failedIndex: number): void {
  for (let i = failedIndex + 1; i < tasks.length; i++) {
    tasks[i].status = 'cancelled'
  }
}
