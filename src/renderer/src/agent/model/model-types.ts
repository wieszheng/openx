/**
 * 模型类型定义
 *
 * 定义 AI 模型层的核心类型，包括：
 * - 模型配置（ModelConfig）
 * - API 消息格式（ChatMessage / ApiMessage）
 * - 流式响应解析结果（ParsedStreamResult）
 * - 规划结果（PlanningResult）
 */

import type { PlanningAction } from '../core/types'
import type { ToolCall } from '../core/types'
import type { OpenAIToolPayload } from '../tools/tool-types'

// ── 模型配置 ──────────────────────────────────────────────────────────────

/** 模型配置 */
export interface ModelConfig {
  /** API Key */
  apiKey: string
  /** API 基地址（如 https://dashscope.aliyuncs.com/compatible-mode/v1） */
  baseUrl: string
  /** 模型名称（如 qwen-plus, gpt-4o） */
  model: string
  /** 请求超时毫秒数（默认 60000） */
  timeout?: number
}

// ── API 消息格式 ──────────────────────────────────────────────────────────

/** 对话消息角色 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/** 内部对话消息 */
export interface ChatMessage {
  /** 消息 ID */
  id: string
  /** 角色 */
  role: MessageRole
  /** 文本内容 */
  content: string
  /** 思维链内容（如 DeepSeek-R1） */
  reasoning?: string
  /** 是否正在思考（流式） */
  isThinking?: boolean
  /** 工具调用列表（assistant 角色） */
  toolCalls?: ToolCall[]
  /** 关联的 tool call ID（tool 角色） */
  toolCallId?: string
  /** 关联的工具名称（tool 角色） */
  toolName?: string
}

/** 发送给 API 的消息格式 */
export interface ApiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_call_id?: string
  name?: string
  tool_calls?: {
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }[]
}

// ── 聊天请求参数 ──────────────────────────────────────────────────────────

/** 聊天补全请求参数 */
export interface ChatCompletionParams {
  /** 消息列表 */
  messages: ApiMessage[]
  /** 工具声明列表 */
  tools?: OpenAIToolPayload[]
  /** 工具选择策略 */
  toolChoice?: 'auto' | 'none' | 'required'
  /** 是否流式 */
  stream?: boolean
}

// ── 流式解析结果 ──────────────────────────────────────────────────────────

/** 一次完整的流式 API 调用解析结果 */
export interface ParsedStreamResult {
  /** 累积的文本内容 */
  content: string
  /** 累积的思维链内容 */
  reasoning: string
  /** 解析出的工具调用列表 */
  toolCalls: ToolCall[]
  /** 完成原因 */
  finishReason: string | null
}

// ── 规划结果 ──────────────────────────────────────────────────────────────

/** AI 规划结果 */
export interface PlanningResult {
  /** AI 思考内容 */
  thought: string
  /** 规划出的动作列表 */
  actions: PlanningAction[]
  /** 是否应继续规划 */
  shouldContinue: boolean
  /** 跨步骤记忆 */
  memory?: string
  /** 子目标更新（deepThink 模式） */
  subGoals?: string[]
  /** 原始 AI 文本响应 */
  rawContent: string
  /** AI 返回的工具调用（function calling 模式），用于关联 task 与 UI 状态 */
  toolCalls?: ToolCall[]
}
