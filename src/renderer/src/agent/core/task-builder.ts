/**
 * TaskBuilder - Plan → Task 转换
 *
 * 对标 Midscene 的 TaskBuilder，将 AI 规划阶段生成的
 * PlanningAction[] 转换为可执行的 ExecutionTask[]。
 *
 * 转换逻辑：
 * - 每个包含工具调用的 PlanningAction → 一个 ExecutionTask
 * - 每个任务保留工具调用的关联 ID（toolCallId）用于结果回填
 * - 任务按原始顺序排列
 */

import { nanoid } from 'nanoid'
import type { PlanningAction, ExecutionTask, ToolCall } from './types'

/** TaskBuilder 构建选项 */
export interface TaskBuilderOptions {
  /** 关联的 ToolCall 列表（来自 AI 响应） */
  toolCalls?: ToolCall[]
}

/**
 * 将 PlanningAction[] 转换为 ExecutionTask[]
 *
 * @param actions - AI 规划阶段生成的动作列表
 * @param options - 构建选项（含关联的 ToolCall 信息）
 * @returns 可执行的任务列表
 */
export function buildTasks(
  actions: PlanningAction[],
  options?: TaskBuilderOptions,
): ExecutionTask[] {
  const tasks: ExecutionTask[] = []
  const toolCallsMap = new Map<string, ToolCall>()

  // 建立 toolCallId → ToolCall 映射
  if (options?.toolCalls) {
    for (const tc of options.toolCalls) {
      toolCallsMap.set(tc.id, tc)
    }
  }

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    const task = actionToTask(action, i, toolCallsMap)
    tasks.push(task)
  }

  return tasks
}

/**
 * 将单个 PlanningAction 转换为 ExecutionTask
 */
function actionToTask(
  action: PlanningAction,
  index: number,
  toolCallsMap: Map<string, ToolCall>,
): ExecutionTask {
  // 尝试从 toolCalls 中找到匹配的调用（按索引关联）
  const toolCall = toolCallsMap.size > index
    ? Array.from(toolCallsMap.values())[index]
    : undefined

  return {
    id: nanoid(),
    actionType: action.actionType,
    params: action.params,
    status: 'pending',
    toolCallId: toolCall?.id,
    locate: action.locate,
  }
}
