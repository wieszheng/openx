/**
 * ConversationHistory - 对话历史管理
 *
 * 对标 Midscene 的 ConversationHistory 设计，管理跨规划轮次的对话状态：
 * - 消息列表的增删改查
 * - 压缩机制：超过阈值时保留最近 N 条，其余替换为摘要占位
 * - 子目标（SubGoal）状态机：pending → running → finished
 * - 跨轮次记忆（memories）
 * - 待发送反馈（pendingFeedback）：工具执行结果传递给下一轮规划
 * - 导出为 API 消息格式（含图片数量限制）
 */

import type { ToolResult } from '../core/types'
import type { ApiMessage } from '../model/model-types'
import type { SubGoal, SubGoalStatus, HistoryMessage } from './message-types'

/** ConversationHistory 配置 */
export interface ConversationHistoryConfig {
  /** 消息压缩阈值（默认 50） */
  compressThreshold?: number
  /** 压缩时保留最近 N 条（默认 20） */
  keepRecentCount?: number
  /** 导出给 API 时最大图片数（默认 5） */
  maxImages?: number
  /** 单条反馈最大字符数（默认 500） */
  maxFeedbackLength?: number
}

/** 默认配置 */
const DEFAULT_CONFIG: Required<ConversationHistoryConfig> = {
  compressThreshold: 50,
  keepRecentCount: 20,
  maxImages: 5,
  maxFeedbackLength: 500,
}

/**
 * 对话历史管理器
 *
 * 管理跨规划轮次的对话状态，对标 Midscene 的 ConversationHistory。
 * 核心职责：
 * 1. 消息管理：追加、查找、导出
 * 2. 压缩机制：超阈值时裁剪，防止 token 溢出
 * 3. 子目标管理：pending → running → finished 状态机
 * 4. 记忆管理：跨步骤的关键信息提取
 * 5. 反馈管理：工具执行结果传递给下一轮规划
 */
export class ConversationHistory {
  private messages: HistoryMessage[] = []
  private subGoals: SubGoal[] = []
  private memories: string[] = []
  private historicalLogs: string[] = []
  private pendingFeedback = ''
  private readonly config: Required<ConversationHistoryConfig>

  constructor(config?: ConversationHistoryConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ── 消息管理 ────────────────────────────────────────────────────────

  /** 追加一条消息 */
  append(message: HistoryMessage): void {
    this.messages.push({ ...message, timestamp: message.timestamp || Date.now() })
  }

  /** 用初始消息列表重置（清空旧消息后填充） */
  seed(messages: HistoryMessage[]): void {
    this.messages = messages.map((m) => ({
      ...m,
      timestamp: m.timestamp || Date.now(),
    }))
  }

  /** 清空所有状态 */
  reset(): void {
    this.messages = []
    this.subGoals = []
    this.memories = []
    this.historicalLogs = []
    this.pendingFeedback = ''
  }

  /** 当前消息数量 */
  get length(): number {
    return this.messages.length
  }

  /** 获取消息列表（只读副本） */
  getMessages(): readonly HistoryMessage[] {
    return [...this.messages]
  }

  /** 更新指定索引的消息 */
  updateMessageAt(index: number, updater: (msg: HistoryMessage) => HistoryMessage): void {
    if (index >= 0 && index < this.messages.length) {
      this.messages[index] = updater(this.messages[index])
    }
  }

  /** 获取最后一条消息的索引 */
  get lastMessageIndex(): number {
    return this.messages.length - 1
  }

  // ── 压缩机制 ────────────────────────────────────────────────────────

  /**
   * 压缩对话历史
   *
   * 当消息数超过 threshold 时：
   * - 保留最近 keepCount 条消息
   * - 在前面插入一条占位消息说明省略了多少条
   */
  compress(): void {
    const { compressThreshold, keepRecentCount } = this.config
    if (this.messages.length <= compressThreshold) return

    const omitted = this.messages.length - keepRecentCount
    const recentMessages = this.messages.slice(-keepRecentCount)

    this.messages = [
      {
        role: 'system',
        content: `(${omitted} 条之前的对话消息已省略)`,
        timestamp: Date.now(),
      },
      ...recentMessages,
    ]
  }

  // ── 子目标管理 ──────────────────────────────────────────────────────

  /** 设置全部子目标，自动标记第一个为 running */
  setSubGoals(goals: string[]): void {
    this.subGoals = goals.map((description, index) => ({
      index,
      description,
      status: (index === 0 ? 'running' : 'pending') as SubGoalStatus,
      logs: [],
    }))
  }

  /** 合并更新子目标（保留已有 description，处理紧凑更新） */
  mergeSubGoals(goals: string[]): void {
    goals.forEach((description, index) => {
      if (index < this.subGoals.length) {
        if (description && description.length > this.subGoals[index].description.length) {
          this.subGoals[index].description = description
        }
      } else {
        this.subGoals.push({ index, description, status: 'pending', logs: [] })
      }
    })
    this.markFirstPendingAsRunning()
  }

  /** 更新单个子目标 */
  updateSubGoal(index: number, updates: Partial<Pick<SubGoal, 'description' | 'status'>>): void {
    if (index < 0 || index >= this.subGoals.length) return
    const goal = this.subGoals[index]

    if (updates.description !== undefined) {
      goal.description = updates.description
      goal.logs = []
    }
    if (updates.status !== undefined) {
      goal.status = updates.status
      goal.logs = []
    }
  }

  /** 标记第一个 pending 子目标为 running */
  markFirstPendingAsRunning(): void {
    const pending = this.subGoals.find((g) => g.status === 'pending')
    if (pending) pending.status = 'running'
  }

  /** 标记子目标完成，自动推进下一个 pending 为 running */
  markSubGoalFinished(index: number): void {
    if (index < 0 || index >= this.subGoals.length) return
    this.subGoals[index].status = 'finished'

    const next = this.subGoals.find((g) => g.status === 'pending')
    if (next) next.status = 'running'
  }

  /** 标记所有子目标完成 */
  markAllSubGoalsFinished(): void {
    this.subGoals.forEach((g) => (g.status = 'finished'))
  }

  /** 向当前 running 的子目标追加日志 */
  appendSubGoalLog(log: string): void {
    const running = this.subGoals.find((g) => g.status === 'running')
    if (running) running.logs.push(log)
  }

  /** 子目标转文本 */
  subGoalsToText(): string {
    if (this.subGoals.length === 0) return ''

    const lines: string[] = ['当前子目标：']
    this.subGoals.forEach((g) => {
      const icon = g.status === 'finished' ? '✓' : g.status === 'running' ? '→' : '○'
      lines.push(`  ${icon} [${g.index}] ${g.description}`)
      if (g.logs.length > 0) {
        g.logs.forEach((log) => lines.push(`    - ${log}`))
      }
    })
    return lines.join('\n')
  }

  // ── 历史日志 ────────────────────────────────────────────────────────

  /** 追加历史日志 */
  appendHistoricalLog(log: string): void {
    this.historicalLogs.push(log)
  }

  /** 历史日志转文本 */
  historicalLogsToText(): string {
    if (this.historicalLogs.length === 0) return ''
    return `已执行的步骤：\n${this.historicalLogs.map((log) => `  - ${log}`).join('\n')}`
  }

  // ── 记忆管理 ────────────────────────────────────────────────────────

  /** 追加记忆 */
  appendMemory(memory: string): void {
    this.memories.push(memory)
  }

  /** 获取所有记忆 */
  getMemories(): readonly string[] {
    return [...this.memories]
  }

  /** 记忆转文本 */
  memoriesToText(): string {
    if (this.memories.length === 0) return ''
    return `前序步骤的记忆：\n---\n${this.memories.join('\n')}\n---`
  }

  /** 清空记忆 */
  clearMemories(): void {
    this.memories = []
  }

  // ── 反馈管理 ────────────────────────────────────────────────────────

  /**
   * 设置待发送反馈
   *
   * 由 TaskExecutor 在工具执行后写入，下一轮规划时消费。
   * 自动截断超长反馈以防止上下文爆炸。
   */
  setPendingFeedback(feedback: string): void {
    const { maxFeedbackLength } = this.config
    const truncated =
      feedback.length > maxFeedbackLength
        ? feedback.slice(0, maxFeedbackLength) + '...[truncated]'
        : feedback

    const timestamp = new Date().toISOString()
    this.pendingFeedback = `[${timestamp}] ${truncated}`
  }

  /** 从工具执行结果构建反馈 */
  addToolResultFeedback(toolName: string, result: ToolResult): void {
    if (result.success) {
      const summary = result.data
        ? Object.entries(result.data)
            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
            .join(', ')
        : '成功'
      this.setPendingFeedback(`工具 [${toolName}] 执行成功: ${summary}`)
    } else {
      this.setPendingFeedback(`工具 [${toolName}] 执行失败: ${result.error || '未知错误'}`)
    }
  }

  /**
   * 消费并清除待发送反馈
   *
   * @returns 反馈文本，如果无反馈则返回 null
   */
  consumePendingFeedback(): string | null {
    if (!this.pendingFeedback) return null
    const feedback = this.pendingFeedback
    this.pendingFeedback = ''
    return feedback
  }

  // ── 导出 ────────────────────────────────────────────────────────────

  /**
   * 导出为 API 消息格式
   *
   * 将内部消息列表转换为可发送给 AI API 的格式。
   *
   * @param includeSystemPrompt - 是否包含系统提示词（通常由调用方单独添加）
   * @returns API 消息数组
   */
  toApiMessages(includeSystemPrompt: boolean = false): ApiMessage[] {
    this.compress()

    return this.messages
      .filter((m) => {
        if (m.role === 'system' && !includeSystemPrompt) return false
        return true
      })
      .map((m) => this.historyMessageToApi(m))
  }

  /** 将 HistoryMessage 转换为 ApiMessage */
  private historyMessageToApi(msg: HistoryMessage): ApiMessage {
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.toolCallId,
        name: msg.toolName,
      }
    }

    if (msg.role === 'assistant') {
      return {
        role: 'assistant',
        content: msg.content || '',
        ...(msg.toolCalls && msg.toolCalls.length > 0
          ? {
              tool_calls: msg.toolCalls.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            }
          : {}),
      }
    }

    return { role: msg.role, content: msg.content }
  }

  /**
   * 构建规划上下文文本
   *
   * 将子目标、记忆、历史日志、待发送反馈合并为一段文本，
   * 用于注入到 system prompt 或 user message 中。
   */
  buildPlanningContext(): string {
    const parts: string[] = []

    const subGoalsText = this.subGoalsToText()
    if (subGoalsText) parts.push(subGoalsText)

    const memoriesText = this.memoriesToText()
    if (memoriesText) parts.push(memoriesText)

    const logsText = this.historicalLogsToText()
    if (logsText) parts.push(logsText)

    const feedback = this.consumePendingFeedback()
    if (feedback) parts.push(`上次操作的反馈：\n${feedback}`)

    return parts.join('\n\n')
  }
}
