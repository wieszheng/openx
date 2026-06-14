/**
 * Agent 核心类型定义
 *
 * 定义 Agent 系统中所有核心数据结构，包括：
 * - Agent 事件（AgentEvent）：Agent 运行时向 UI 层推送的状态变更事件
 * - 规划动作（PlanningAction）：AI 规划阶段生成的结构化动作
 * - 执行任务（ExecutionTask）：PlanningAction 转换后的可执行任务
 * - 任务状态与结果类型
 */

// ── 基础类型（AgentEvent 依赖，须前置定义） ───────────────────────────

/** 流式响应片段 */
export interface StreamChunk {
  /** 文本内容增量 */
  content?: string
  /** 思维链增量（如 DeepSeek-R1） */
  reasoning?: string
  /** 工具调用增量 */
  toolCalls?: ToolCallDelta[]
}

/** 工具调用增量（流式） */
export interface ToolCallDelta {
  index: number
  id?: string
  name?: string
  arguments?: string
}

/** 元素定位信息 */
export interface LocateInfo {
  /** 目标文字描述 */
  description?: string
  /** 坐标 x */
  x?: number
  /** 坐标 y */
  y?: number
  /** XPath 表达式 */
  xpath?: string
  /** CSS 选择器 */
  selector?: string
  /** 文字匹配关键词 */
  targetText?: string
  /** 文字匹配方式 */
  matchType?: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex'
}

/** AI 规划阶段生成的结构化动作 */
export interface PlanningAction {
  /** 动作类型，如 'tap' | 'input' | 'launch' | 'add_workflow_nodes' 等 */
  actionType: string
  /** 动作参数 */
  params: Record<string, unknown>
  /** AI 对该动作的思考说明 */
  thought?: string
  /** 定位信息（可选，用于需要点击/操作 UI 元素的场景） */
  locate?: LocateInfo
}

/** 任务状态 */
export type TaskStatus = 'pending' | 'running' | 'finished' | 'failed' | 'cancelled'

/** 定位结果 */
export interface LocateResult {
  /** 定位成功 */
  success: boolean
  /** 中心坐标 */
  x?: number
  y?: number
  /** 错误信息 */
  error?: string
}

/** 执行任务：PlanningAction 转换后的可执行任务 */
export interface ExecutionTask {
  /** 唯一标识 */
  id: string
  /** 关联的规划动作 */
  actionType: string
  /** 任务参数 */
  params: Record<string, unknown>
  /** 当前状态 */
  status: TaskStatus
  /** 关联的 tool call ID（如果有） */
  toolCallId?: string
  /** 定位信息 */
  locate?: LocateInfo
  /** 前序定位结果（由 TaskRunner 传递） */
  previousLocateResult?: LocateResult
}

/** 工具调用结果 */
export interface ToolResult {
  /** 是否成功 */
  success: boolean
  /** 结果数据（成功时） */
  data?: Record<string, unknown>
  /** 错误信息（失败时） */
  error?: string
  /** 关联截图 base64 data URL（可选） */
  screenshot?: string
}

/** 已解析的工具调用（非流式，完整态） */
export interface ToolCall {
  /** 调用 ID */
  id: string
  /** 工具名称 */
  name: string
  /** 参数 JSON 字符串 */
  arguments: string
  /** 调用状态 */
  status: 'pending' | 'success' | 'error'
  /** 执行结果 */
  result?: ToolResult
  /** 关联截图 */
  screenshot?: string
}

/** 画布节点数据 */
export interface CanvasNode {
  /** 节点 ID */
  id: string
  /** 节点类型 */
  type: string
  /** 显示标签 */
  label: string
  /** 节点参数 */
  params: Record<string, unknown>
  /** 位置 */
  position: { x: number; y: number }
}

// ── Agent 事件 ────────────────────────────────────────────────────────────

/** Agent 运行时向 UI 层推送的事件类型 */
export type AgentEvent =
  | { type: 'planning:start'; turn: number }
  | { type: 'planning:complete'; plan: PlanningAction[]; thought: string; shouldContinue: boolean }
  | { type: 'planning:error'; error: string; recoverable: boolean }
  | { type: 'task:start'; task: ExecutionTask }
  | { type: 'task:progress'; taskId: string; partial: StreamChunk }
  | { type: 'task:complete'; taskId: string; result: ToolResult }
  | { type: 'task:failed'; taskId: string; error: string }
  | { type: 'tool:call'; toolCallId: string; toolName: string; arguments: string }
  | { type: 'tool:result'; toolCallId: string; result: ToolResult }
  | { type: 'canvas:node-added'; node: CanvasNode }
  | { type: 'canvas:cleared' }
  | { type: 'agent:complete'; summary: string }
  | { type: 'agent:error'; error: string }
  | { type: 'agent:aborted' }

// ── Agent 配置 ────────────────────────────────────────────────────────────

/** Agent 运行配置 */
export interface AgentConfig {
  /** 最大规划轮次（默认 10） */
  replanLimit?: number
  /** 单轮最大错误数（默认 5） */
  errorLimit?: number
  /** 最大对话历史条数（默认 50） */
  maxHistoryMessages?: number
  /** 保留最近 N 条消息（默认 20） */
  keepRecentMessages?: number
  /** 对话历史中最大图片数（默认 5） */
  maxImagesInHistory?: number
  /** 是否启用规划缓存 */
  enableCache?: boolean
}
