/**
 * OpenAI 兼容适配器
 *
 * 适配所有兼容 OpenAI Chat Completion API 的模型服务，包括：
 * - OpenAI GPT 系列
 * - 阿里云通义千问（DashScope compatible mode）
 * - DeepSeek / Kimi / 智谱 / 豆包 等
 *
 * 对标 Midscene 的 standard 规划适配器，使用 function calling 作为
 * 主要交互方式，不支持时优雅降级为纯文本模式。
 */

import type { ModelAdapter } from './adapter'
import type {
  ModelConfig,
  ChatCompletionParams,
  ParsedStreamResult,
  PlanningResult,
} from './model-types'
import type { StreamChunk, PlanningAction } from '../core/types'
import { StreamParser, readStreamChunks, splitSseLines } from './stream-parser'

/** 纯文本模式下的 [STEP] 行正则 */
const STEP_LINE_REGEX = /^\[STEP\]\s*(\{.*\})$/

/**
 * OpenAI 适配器错误
 *
 * 携带 HTTP 状态码和原始响应文本，便于上层判断是否为 tools 不支持错误。
 */
export class OpenAIAdapterError extends Error {
  readonly status: number
  readonly responseBody: string

  constructor(message: string, status: number, responseBody: string) {
    super(message)
    this.name = 'OpenAIAdapterError'
    this.status = status
    this.responseBody = responseBody
  }
}

/**
 * 创建 OpenAI 兼容适配器
 *
 * @param config - 模型配置
 * @returns ModelAdapter 实例
 */
export function createOpenAIAdapter(config: ModelConfig): ModelAdapter {
  return new OpenAIAdapter(config)
}

class OpenAIAdapter implements ModelAdapter {
  readonly config: ModelConfig

  constructor(config: ModelConfig) {
    this.config = config
  }

  supportsToolCalling(): boolean {
    return true
  }

  async *chatCompletionStream(
    params: ChatCompletionParams,
    signal: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const url = `${this.config.baseUrl}/chat/completions`

    const requestBody: Record<string, unknown> = {
      model: this.config.model,
      messages: params.messages,
      stream: true,
    }

    if (params.tools && params.tools.length > 0) {
      requestBody.tools = params.tools
      requestBody.tool_choice = params.toolChoice ?? 'auto'
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new OpenAIAdapterError(
        `API 请求出错 (${response.status}): ${errorText || response.statusText}`,
        response.status,
        errorText,
      )
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('流式数据读取失败')

    const parser = new StreamParser()
    let buffer = ''

    for await (const textChunk of readStreamChunks(reader)) {
      const [chunks, remaining] = parser.processChunk(textChunk, buffer)
      buffer = remaining

      for (const chunk of chunks) {
        yield chunk
      }
    }

    // 处理残留缓冲区
    if (buffer.trim()) {
      const [lines] = splitSseLines(buffer, '')
      for (const line of lines) {
        const chunk = parser.processLine(line.data)
        if (chunk) yield chunk
      }
    }
  }

  parsePlanningResult(result: ParsedStreamResult): PlanningResult {
    // 优先从 tool_calls 提取
    if (result.toolCalls.length > 0) {
      return this.parseFromToolCalls(result)
    }
    // 降级：从文本内容解析 [STEP] 结构
    return this.parseFromText(result)
  }

  /**
   * 从 tool_calls 提取规划动作
   */
  private parseFromToolCalls(result: ParsedStreamResult): PlanningResult {
    const actions: PlanningAction[] = []

    for (const tc of result.toolCalls) {
      const action = this.toolCallToAction(tc)
      if (action) actions.push(action)
    }

    return {
      thought: result.reasoning || result.content,
      actions,
      shouldContinue: actions.length > 0,
      rawContent: result.content,
      toolCalls: result.toolCalls,
    }
  }

  /**
   * 将单个 ToolCall 转为 PlanningAction
   */
  private toolCallToAction(tc: {
    id: string
    name: string
    arguments: string
  }): PlanningAction | null {
    let params: Record<string, unknown>
    try {
      params = JSON.parse(tc.arguments || '{}')
    } catch {
      return null
    }

    return { actionType: tc.name, params }
  }

  /**
   * 从纯文本内容解析 [STEP] 结构（降级模式）
   *
   * 当模型不支持 function calling 时，AI 可能输出如下格式：
   * ```
   * [STEP] {"type":"action-tap","label":"点击","params":{"x":100,"y":200}}
   * [STEP] {"type":"action-swipe","label":"滑动","params":{"x1":0,"y1":500,"x2":0,"y2":100}}
   * ```
   */
  private parseFromText(result: ParsedStreamResult): PlanningResult {
    const actions: PlanningAction[] = []
    const lines = result.content.split('\n')

    for (const line of lines) {
      const match = line.match(STEP_LINE_REGEX)
      if (!match) continue

      try {
        const step = JSON.parse(match[1])
        if (step && step.type) {
          actions.push({
            actionType: step.type,
            params: step.params || {},
            thought: step.label,
          })
        }
      } catch {
        // 忽略解析失败的行
      }
    }

    return {
      thought: result.reasoning || result.content,
      actions,
      shouldContinue: actions.length > 0,
      rawContent: result.content,
    }
  }
}
