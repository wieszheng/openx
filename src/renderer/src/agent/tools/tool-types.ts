/**
 * 工具类型定义
 *
 * 定义工具系统的核心类型，包括：
 * - ToolDefinition：工具定义（通过 defineTool 工厂创建）
 * - ToolContext：工具执行上下文
 * - ToolParamSchema：工具参数 JSON Schema 描述
 */

import type { ToolResult } from '../core/types'

// ── 参数 Schema ───────────────────────────────────────────────────────────

/** JSON Schema 属性定义 */
export interface ToolParamProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'integer'
  description?: string
  enum?: string[]
  items?: ToolParamProperty
  properties?: Record<string, ToolParamProperty>
  required?: string[]
  default?: unknown
}

/** 工具参数 JSON Schema */
export interface ToolParamSchema {
  type: 'object'
  properties: Record<string, ToolParamProperty>
  required?: string[]
}

// ── 工具执行上下文 ────────────────────────────────────────────────────────

/** 工具执行时的上下文信息 */
export interface ToolContext {
  /** 当前选中的设备 ID */
  deviceId: string | null
  /** 是否开启实机交互模式 */
  isInteractive: boolean
  /** 后端 API 基地址 */
  baseUrl: string
  /** AbortSignal，用于取消执行 */
  signal: AbortSignal
  /** 画布操作回调 */
  canvas: ToolCanvasOps
}

/** 画布操作接口（工具通过此接口操作 React Flow 画布） */
export interface ToolCanvasOps {
  /** 追加单个节点 */
  appendNode: (step: { type: string; label: string; params: Record<string, unknown> }) => void
  /** 清空画布（保留触发器节点） */
  clearCanvas: () => void
}

// ── 工具定义 ──────────────────────────────────────────────────────────────

/** 工具定义（由 defineTool 工厂函数创建） */
export interface ToolDefinition {
  /** 工具唯一名称 */
  name: string
  /** 工具描述（给 AI 阅读） */
  description: string
  /** 参数 JSON Schema */
  paramSchema: ToolParamSchema
  /** 是否需要实机设备（用于拦截检查） */
  requiresDevice: boolean
  /** 执行函数 */
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>
}

/** OpenAI function calling 格式的工具声明 */
export interface OpenAIToolPayload {
  type: 'function'
  function: {
    name: string
    description: string
    parameters?: ToolParamSchema
  }
}
