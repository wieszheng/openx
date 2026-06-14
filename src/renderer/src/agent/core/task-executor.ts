/**
 * TaskExecutor - 规划循环核心
 *
 * 对标 Midscene 的 TaskExecutor，是 Agent 的顶层编排器。
 * 实现经典的 Plan → Execute → Observe → Replan 循环：
 *
 * 1. Plan：调用 AI 生成下一步动作（通过 Planner）
 * 2. Build：将 PlanningAction 转换为 ExecutionTask（通过 TaskBuilder）
 * 3. Execute：顺序执行任务（通过 ExecutionSession + TaskRunner）
 * 4. Observe：收集反馈，写入 ConversationHistory
 * 5. Check：是否需要继续规划？是则回到 1
 *
 * 安全机制：
 * - AbortSignal 全链路传递，支持随时中断
 * - replanCount 上限防止无限循环
 * - errorCount 上限防止连续错误
 * - 每轮检查 signal.aborted
 */

import type { AgentEvent, AgentConfig } from './types'
import type { ModelAdapter } from '../model/adapter'
import type { ConversationHistory } from '../conversation/history'
import type { ToolRegistry } from '../tools/registry'
import type { ToolContext } from '../tools/tool-types'
import type { PromptBuilderOptions } from '../planning/prompt-builder'
import { plan, type PlannerConfig } from '../planning/planner'
import { buildTasks } from './task-builder'
import { ExecutionSession } from './execution-session'

/** TaskExecutor 运行选项 */
export interface TaskExecutorRunOptions {
  /** 用户输入 */
  userPrompt: string
  /** 模型适配器 */
  adapter: ModelAdapter
  /** 对话历史 */
  history: ConversationHistory
  /** 工具注册中心 */
  toolRegistry: ToolRegistry
  /** 工具执行上下文 */
  toolContext: ToolContext
  /** Prompt 构建选项 */
  promptOptions: PromptBuilderOptions
  /** Agent 配置 */
  config: AgentConfig
}

/** 默认配置 */
const DEFAULT_AGENT_CONFIG: Required<AgentConfig> = {
  replanLimit: 10,
  errorLimit: 5,
  maxHistoryMessages: 50,
  keepRecentMessages: 20,
  maxImagesInHistory: 5,
  enableCache: false,
}

/**
 * 执行 Plan-Execute-Observe-Replan 循环
 *
 * 这是 Agent 的核心循环，对标 Midscene TaskExecutor.action()。
 *
 * @param options - 运行选项
 * @param signal - AbortSignal
 * @yields AgentEvent - 运行过程中的所有事件
 */
export async function* executeLoop(
  options: TaskExecutorRunOptions,
  signal: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const { userPrompt, adapter, history, toolRegistry, toolContext, promptOptions } = options
  const config = { ...DEFAULT_AGENT_CONFIG, ...options.config }

  let replanCount = 0
  let errorCount = 0

  // 添加用户消息到历史
  history.append({
    role: 'user',
    content: userPrompt,
    timestamp: Date.now(),
  })

  // 主循环
  while (!signal.aborted) {
    // ── Plan 阶段 ──────────────────────────────────────────────────
    yield { type: 'planning:start', turn: replanCount }

    let planningResult
    try {
      const plannerConfig: PlannerConfig = {
        adapter,
        tools: toolRegistry.getAll(),
        promptOptions,
        history,
      }

      // 消费 plan generator，获取最终结果
      const planStream = plan(plannerConfig, signal)
      let planDone = false

      while (!planDone) {
        const next = await planStream.next()
        if (next.done) {
          planningResult = next.value
          planDone = true
        } else {
          yield next.value
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)

      // 检查是否为中止
      if (signal.aborted) {
        yield { type: 'agent:aborted' }
        return
      }

      // 规划错误：检查是否可恢复
      const recoverable = isRecoverableError(error)
      yield { type: 'planning:error', error: message, recoverable }

      if (!recoverable) {
        yield { type: 'agent:error', error: message }
        return
      }

      // 可恢复错误：增加错误计数，继续循环
      errorCount++
      if (errorCount >= config.errorLimit) {
        yield { type: 'agent:error', error: `连续错误次数达到上限 (${config.errorLimit})` }
        return
      }

      // 将错误写入反馈，下一轮规划时 AI 可以看到
      history.setPendingFeedback(`规划出错: ${message}`)
      continue
    }

    if (!planningResult) {
      yield { type: 'agent:error', error: '规划结果为空' }
      return
    }

    // 规划成功，重置错误计数
    errorCount = 0

    // 无动作 → 任务完成
    if (planningResult.actions.length === 0) {
      // 更新 AI 的回复到历史
      history.append({
        role: 'assistant',
        content: planningResult.rawContent,
        reasoning: planningResult.thought !== planningResult.rawContent ? planningResult.thought : undefined,
        timestamp: Date.now(),
      })

      yield { type: 'agent:complete', summary: planningResult.thought }
      return
    }

    // 将 AI 回复（含 tool_calls）写入历史
    history.append({
      role: 'assistant',
      content: planningResult.rawContent,
      reasoning: planningResult.thought !== planningResult.rawContent ? planningResult.thought : undefined,
      timestamp: Date.now(),
    })

    // ── Build 阶段 ─────────────────────────────────────────────────
    const tasks = buildTasks(planningResult.actions, {
      toolCalls: planningResult.toolCalls,
    })

    // ── Execute 阶段 ──────────────────────────────────────────────
    const session = new ExecutionSession()
    session.append(tasks)

    for await (const event of session.run({
      toolRegistry,
      toolContext,
      delayBetweenTasks: 300,
    })) {
      yield event

      // 收集工具执行结果，写入历史反馈
      if (event.type === 'tool:result') {
        const toolName = findToolNameByCallId(tasks, event.toolCallId)
        if (toolName) {
          history.addToolResultFeedback(toolName, event.result)
        }
      }
    }

    // 执行结果写入历史（tool 消息）
    const sessionTasks = session.getTasks()
    for (const task of sessionTasks) {
      if (task.status === 'finished' || task.status === 'failed') {
        history.append({
          role: 'tool',
          content: JSON.stringify({ actionType: task.actionType, status: task.status }),
          toolCallId: task.toolCallId,
          toolName: task.actionType,
          timestamp: Date.now(),
        })

        // 记录历史日志
        if (task.status === 'finished') {
          history.appendHistoricalLog(`${task.actionType}(${summarizeParams(task.params)})`)
        }
      }
    }

    // ── Observe 阶段 ──────────────────────────────────────────────

    // 检查会话错误
    if (session.isInErrorState) {
      errorCount++
      if (errorCount >= config.errorLimit) {
        yield {
          type: 'agent:error',
          error: `执行错误次数达到上限 (${config.errorLimit})`,
        }
        return
      }
      // 错误反馈已由 addToolResultFeedback 写入
    }

    // 更新记忆
    if (planningResult.memory) {
      history.appendMemory(planningResult.memory)
    }

    // 更新子目标
    if (planningResult.subGoals && planningResult.subGoals.length > 0) {
      history.mergeSubGoals(planningResult.subGoals)
    }

    // ── Check 阶段 ────────────────────────────────────────────────
    if (!planningResult.shouldContinue) {
      yield { type: 'agent:complete', summary: planningResult.thought }
      return
    }

    replanCount++
    if (replanCount >= config.replanLimit) {
      yield {
        type: 'agent:complete',
        summary: `规划轮次达到上限 (${config.replanLimit})，自动停止`,
      }
      return
    }
  }

  // 被中止
  yield { type: 'agent:aborted' }
}

// ── 辅助函数 ────────────────────────────────────────────────────────────

/** 判断错误是否可恢复 */
function isRecoverableError(error: unknown): boolean {
  if (error instanceof Error) {
    // 网络错误、超时等通常是可恢复的
    const message = error.message.toLowerCase()
    if (message.includes('timeout') || message.includes('network') || message.includes('429')) {
      return true
    }
    // API 参数错误通常不可恢复
    if (message.includes('401') || message.includes('403') || message.includes('invalid api')) {
      return false
    }
  }
  // 默认不可恢复
  return false
}

/** 通过 toolCallId 查找工具名称 */
function findToolNameByCallId(
  tasks: import('./types').ExecutionTask[],
  toolCallId: string,
): string | null {
  const task = tasks.find((t) => t.toolCallId === toolCallId)
  return task?.actionType ?? null
}

/** 简要描述任务参数（用于历史日志） */
function summarizeParams(params: Record<string, unknown>): string {
  const entries = Object.entries(params)
  if (entries.length === 0) return ''
  if (entries.length <= 2) {
    return entries.map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ')
  }
  return `${entries.length} params`
}
