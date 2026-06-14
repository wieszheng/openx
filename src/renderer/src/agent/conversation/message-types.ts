/**
 * 对话消息类型定义
 *
 * 定义对话历史管理中使用的消息类型，与 model-types.ts 中的
 * ChatMessage / ApiMessage 区分——本模块关注对话历史的持久化结构，
 * 而 model-types 关注 API 交互格式。
 */

// ── 子目标 ────────────────────────────────────────────────────────────

/** 子目标状态 */
export type SubGoalStatus = 'pending' | 'running' | 'finished'

/** 子目标条目 */
export interface SubGoal {
  /** 序号（从 0 开始） */
  index: number
  /** 目标描述 */
  description: string
  /** 当前状态 */
  status: SubGoalStatus
  /** 执行日志 */
  logs: string[]
}

// ── 历史消息 ──────────────────────────────────────────────────────────

/** 对话历史消息 */
export interface HistoryMessage {
  /** 角色 */
  role: 'system' | 'user' | 'assistant' | 'tool'
  /** 文本内容 */
  content: string
  /** 思维链（assistant 角色，可选） */
  reasoning?: string
  /** 工具调用 ID（tool 角色） */
  toolCallId?: string
  /** 工具名称（tool 角色） */
  toolName?: string
  /** 工具调用列表（assistant 角色） */
  toolCalls?: HistoryToolCall[]
  /** 关联截图（可选，设备感知工具返回的截图） */
  screenshot?: string
  /** 时间戳 */
  timestamp: number
}

/** 历史消息中的工具调用记录 */
export interface HistoryToolCall {
  /** 调用 ID */
  id: string
  /** 工具名称 */
  name: string
  /** 参数 JSON */
  arguments: string
  /** 执行状态 */
  status: 'pending' | 'success' | 'error'
  /** 执行结果摘要 */
  result?: string
  /** 关联截图 */
  screenshot?: string
}

// ── 反馈消息 ──────────────────────────────────────────────────────────

/** 工具执行反馈（写入 pendingFeedback，下一轮规划时消费） */
export interface ToolFeedback {
  /** 工具名称 */
  toolName: string
  /** 是否成功 */
  success: boolean
  /** 结果摘要文本 */
  summary: string
  /** 关联的 Tool Call ID */
  toolCallId?: string
  /** 时间戳 */
  timestamp: number
}
