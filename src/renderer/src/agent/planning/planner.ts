/**
 * Planner - 规划器
 *
 * 对标 Midscene 的 planImpl，负责：
 * 1. 调用 AI 模型生成规划（通过 ModelAdapter）
 * 2. 解析 AI 响应为结构化 PlanningAction
 * 3. 收集流式增量，实时向调用方推送进度
 *
 * 与 Midscene 的区别：
 * - Midscene 将 planning 作为一个 Task 执行，Planner 是独立的规划调用
 * - Planner 只负责单次规划调用，循环由 TaskExecutor 控制
 */

import type { ModelAdapter } from '../model/adapter'
import type { ApiMessage, ParsedStreamResult, PlanningResult } from '../model/model-types'
import type { OpenAIToolPayload } from '../tools/tool-types'
import type { AgentEvent } from '../core/types'
import type { ConversationHistory } from '../conversation/history'
import { buildSystemPrompt } from './prompt-builder'
import type { ToolDefinition } from '../tools/tool-types'
import type { PromptBuilderOptions } from './prompt-builder'

/** 规划器配置 */
export interface PlannerConfig {
  /** 模型适配器 */
  adapter: ModelAdapter
  /** 注册的工具列表 */
  tools: ToolDefinition[]
  /** Prompt 构建选项 */
  promptOptions: PromptBuilderOptions
  /** 对话历史 */
  history: ConversationHistory
}

/**
 * 执行一次规划调用
 *
 * 流程：
 * 1. 构建 System Prompt（动态）
 * 2. 组装消息列表（system + history + context）
 * 3. 调用 AI API（流式）
 * 4. 解析响应为 PlanningResult
 * 5. 通过 yield 实时向调用方推送进度
 *
 * @param config - 规划器配置
 * @param signal - AbortSignal
 * @yields AgentEvent - 规划过程中的状态事件
 * @returns 规划结果
 */
export async function* plan(
  config: PlannerConfig,
  signal: AbortSignal,
): AsyncGenerator<AgentEvent, PlanningResult> {
  const { adapter, tools, promptOptions, history } = config

  // 1. 构建规划上下文
  const planningContext = history.buildPlanningContext()

  // 2. 构建 System Prompt
  const systemPrompt = buildSystemPrompt(tools, promptOptions, planningContext)

  // 3. 组装 API 消息
  const apiMessages = history.toApiMessages()
  const messagesWithSystem: ApiMessage[] = [
    { role: 'system', content: systemPrompt },
    ...apiMessages,
  ]

  // 4. 构建 tools payload
  const toolsPayload: OpenAIToolPayload[] = tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      ...(Object.keys(t.paramSchema.properties).length > 0 ? { parameters: t.paramSchema } : {}),
    },
  }))

  // 5. 流式调用 AI
  let useTools = adapter.supportsToolCalling()

  let content = ''
  let reasoning = ''
  const toolCalls: import('../core/types').ToolCall[] = []
  let finishReason: string | null = null

  try {
    const stream = adapter.chatCompletionStream(
      {
        messages: messagesWithSystem,
        tools: useTools ? toolsPayload : undefined,
        toolChoice: useTools ? 'auto' : undefined,
        stream: true,
      },
      signal,
    )

    for await (const chunk of stream) {
      // 推送流式进度
      yield { type: 'task:progress', taskId: '__planning__', partial: chunk }

      // 累积内容
      if (chunk.content) content += chunk.content
      if (chunk.reasoning) reasoning += chunk.reasoning

      // 累积工具调用
      if (chunk.toolCalls) {
        for (const delta of chunk.toolCalls) {
          const idx = delta.index
          if (!toolCalls[idx]) {
            toolCalls[idx] = {
              id: delta.id || `call_${idx}`,
              name: '',
              arguments: '',
              status: 'pending',
            }
          }
          const builder = toolCalls[idx]
          if (delta.id) builder.id = delta.id
          if (delta.name) builder.name = delta.name
          if (delta.arguments) builder.arguments += delta.arguments
        }
      }
    }
  } catch (error: unknown) {
    // 如果是 tools 不支持错误，降级重试
    if (
      error instanceof Error &&
      'status' in error &&
      (error as { status: number }).status === 400 &&
      useTools
    ) {
      useTools = false
      // 递归重试（不传 tools），捕获 yield* 的返回值
      const fallbackResult: PlanningResult = yield* planWithoutTools(adapter, messagesWithSystem, signal)
      return fallbackResult
    }
    throw error
  }

  // 6. 解析结果
  const parsedResult: ParsedStreamResult = {
    content,
    reasoning,
    toolCalls: toolCalls.filter(Boolean),
    finishReason,
  }

  const planningResult = adapter.parsePlanningResult(parsedResult)

  yield {
    type: 'planning:complete',
    plan: planningResult.actions,
    thought: planningResult.thought,
    shouldContinue: planningResult.shouldContinue,
  }

  return planningResult
}

/**
 * 无工具模式下的规划调用（降级）
 */
async function* planWithoutTools(
  adapter: ModelAdapter,
  messages: ApiMessage[],
  signal: AbortSignal,
): AsyncGenerator<AgentEvent, PlanningResult> {
  let content = ''
  let reasoning = ''

  const stream = adapter.chatCompletionStream(
    { messages, stream: true },
    signal,
  )

  for await (const chunk of stream) {
    yield { type: 'task:progress', taskId: '__planning__', partial: chunk }
    if (chunk.content) content += chunk.content
    if (chunk.reasoning) reasoning += chunk.reasoning
  }

  const parsedResult: ParsedStreamResult = {
    content,
    reasoning,
    toolCalls: [],
    finishReason: null,
  }

  const planningResult = adapter.parsePlanningResult(parsedResult)

  yield {
    type: 'planning:complete',
    plan: planningResult.actions,
    thought: planningResult.thought,
    shouldContinue: planningResult.shouldContinue,
  }

  return planningResult
}
