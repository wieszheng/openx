/**
 * ToolRegistry - 工具注册中心
 *
 * 管理所有已注册的工具定义，提供：
 * - 工具注册/注销
 * - 按名称查找工具
 * - 生成 OpenAI function calling 格式的 tools payload
 * - 执行指定工具（含前置检查）
 */

import type { ToolDefinition, ToolContext, OpenAIToolPayload } from './tool-types'
import type { ToolResult } from '../core/types'

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>()

  /**
   * 注册一个工具
   *
   * @param tool - 工具定义
   * @throws 工具名称已存在时抛出错误
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" already registered`)
    }
    this.tools.set(tool.name, tool)
  }

  /**
   * 批量注册工具
   *
   * @param tools - 工具定义数组
   */
  registerAll(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool)
    }
  }

  /**
   * 注销一个工具
   *
   * @param name - 工具名称
   * @returns 是否成功注销
   */
  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * 按名称获取工具定义
   *
   * @param name - 工具名称
   * @returns 工具定义或 undefined
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  /**
   * 获取所有已注册的工具
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  /**
   * 获取已注册工具数量
   */
  get size(): number {
    return this.tools.size
  }

  /**
   * 生成 OpenAI function calling 格式的 tools payload
   *
   * @returns 可直接传入 API 请求的 tools 数组
   */
  toToolsPayload(): OpenAIToolPayload[] {
    return this.getAll().map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.paramSchema,
      },
    }))
  }

  /**
   * 执行指定工具
   *
   * 执行前自动进行前置检查：
   * 1. 工具是否存在
   * 2. 实机交互模式检查
   * 3. 设备连接检查
   *
   * @param name - 工具名称
   * @param argsJson - 参数 JSON 字符串
   * @param context - 工具执行上下文
   * @returns 工具执行结果
   */
  async execute(name: string, argsJson: string, context: ToolContext): Promise<ToolResult> {
    // 1. 工具是否存在
    const tool = this.tools.get(name)
    if (!tool) {
      return { success: false, error: `未定义工具: ${name}` }
    }

    // 2. 解析参数
    let args: Record<string, unknown>
    try {
      args = JSON.parse(argsJson || '{}')
    } catch {
      return { success: false, error: `参数 JSON 解析失败: ${argsJson}` }
    }

    // 3. 实机交互模式检查
    if (!context.isInteractive && tool.requiresDevice) {
      return {
        success: false,
        error: `工具 [${name}] 执行被拦截。原因：用户禁用了"实机交互模式"或未连接设备。`,
      }
    }

    // 4. 设备连接检查
    if (tool.requiresDevice && !context.deviceId) {
      return {
        success: false,
        error: `无法执行工具 [${name}]，当前未连接或未选中任何设备。`,
      }
    }

    // 5. 执行
    try {
      return await tool.execute(args, context)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
