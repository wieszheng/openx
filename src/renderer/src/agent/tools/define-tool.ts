/**
 * defineTool() 工厂函数
 *
 * 对标 Midscene 的 defineAction()，以声明式方式定义工具。
 * 每个工具包含名称、描述、参数 Schema、执行函数和元信息，
 * 由 ToolRegistry 统一注册管理。
 *
 * @example
 * ```ts
 * const screenshotTool = defineTool({
 *   name: 'get_device_screenshot',
 *   description: '抓取当前设备的屏幕截图',
 *   paramSchema: { type: 'object', properties: {} },
 *   requiresDevice: true,
 *   execute: async (_args, ctx) => {
 *     const res = await window.api.screencap.capture(ctx.deviceId!)
 *     return res.ok
 *       ? { success: true, data: { mimeType: res.mimeType }, screenshot: `data:${res.mimeType};base64,${res.data}` }
 *       : { success: false, error: res.error }
 *   }
 * })
 * ```
 */

import type { ToolDefinition, ToolParamSchema, ToolContext } from './tool-types'
import type { ToolResult } from '../core/types'

/** defineTool 配置参数 */
export interface DefineToolConfig {
  /** 工具唯一名称，如 'get_device_screenshot' */
  name: string
  /** 工具描述，给 AI 阅读理解用途 */
  description: string
  /** 参数 JSON Schema */
  paramSchema: ToolParamSchema
  /** 是否需要实机设备连接（默认 false） */
  requiresDevice?: boolean
  /** 执行函数 */
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>
}

/**
 * 定义一个工具
 *
 * @param config - 工具配置
 * @returns ToolDefinition 实例，可直接注册到 ToolRegistry
 */
export function defineTool(config: DefineToolConfig): ToolDefinition {
  return {
    name: config.name,
    description: config.description,
    paramSchema: config.paramSchema,
    requiresDevice: config.requiresDevice ?? false,
    execute: config.execute,
  }
}
