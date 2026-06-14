/**
 * SSE 流式解析器
 *
 * 解析 OpenAI 兼容 API 的 Server-Sent Events (SSE) 流式响应，
 * 将增量 delta 合并为完整的工具调用、文本内容和思维链。
 *
 * 对标 Midscene 的 service-caller 流式处理逻辑，独立为可复用模块。
 *
 * @example
 * ```ts
 * const parser = new StreamParser()
 * const reader = response.body!.getReader()
 *
 * for await (const chunk of readStreamChunks(reader)) {
 *   const deltas = parser.processChunk(chunk)
 *   parser.getResult()
 * }
 * ```
 */

import type { StreamChunk, ToolCallDelta, ToolCall } from '../core/types'
import type { ParsedStreamResult } from './model-types'
import { nanoid } from 'nanoid'

/** SSE 数据行 */
interface SseLine {
  data: string
}

/**
 * 从 ReadableStreamDefaultReader 中逐块读取文本
 *
 * @param reader - ReadableStream reader
 * @yields 解码后的文本块
 */
export async function* readStreamChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<string> {
  const decoder = new TextDecoder('utf-8')
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    yield decoder.decode(value, { stream: true })
  }
}

/**
 * 将文本块按换行拆分为 SSE 行
 *
 * SSE 协议中每条消息以双换行分隔，
 * 此函数处理了跨 chunk 的行分割问题。
 *
 * @param chunk - 原始文本块
 * @param buffer - 上次未处理完的缓冲区
 * @returns [解析出的行列表, 剩余缓冲区]
 */
export function splitSseLines(chunk: string, buffer: string): [SseLine[], string] {
  const lines: SseLine[] = []
  const combined = buffer + chunk
  const parts = combined.split('\n')
  // 最后一行可能不完整，保留到下次处理
  const remaining = parts.pop() || ''

  for (const line of parts) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === 'data: [DONE]') continue
    if (trimmed.startsWith('data: ')) {
      lines.push({ data: trimmed.slice(6) })
    }
  }

  return [lines, remaining]
}

/**
 * SSE 流式解析器
 *
 * 将 SSE 增量 delta 累积合并为完整的解析结果。
 * 支持三种增量类型：content、reasoning_content、tool_calls。
 */
export class StreamParser {
  /** 累积文本内容 */
  private content = ''
  /** 累积思维链内容 */
  private reasoning = ''
  /** 累积工具调用（按 index 存储） */
  private toolCalls: (Partial<ToolCall> | null)[] = []
  /** 完成原因 */
  private finishReason: string | null = null

  /**
   * 处理一个 SSE 数据行
   *
   * @param data - SSE data 字段内容（JSON 字符串）
   * @returns 解析出的增量 StreamChunk，或 null（解析失败/无有效 delta）
   */
  processLine(data: string): StreamChunk | null {
    try {
      const json = JSON.parse(data)
      const delta = json.choices?.[0]?.delta
      this.finishReason = json.choices?.[0]?.finish_reason ?? this.finishReason

      if (!delta) return null

      const chunk: StreamChunk = {}

      // 1. 普通文本内容
      if (delta.content) {
        this.content += delta.content
        chunk.content = delta.content
      }

      // 2. 思维链（DeepSeek-R1 等）
      if (delta.reasoning_content) {
        this.reasoning += delta.reasoning_content
        chunk.reasoning = delta.reasoning_content
      }

      // 3. 工具调用
      if (delta.tool_calls) {
        const toolCallDeltas: ToolCallDelta[] = []

        for (let i = 0; i < delta.tool_calls.length; i++) {
          const tc = delta.tool_calls[i]
          const idx = tc.index !== undefined ? tc.index : i

          // 初始化该 index 的工具调用槽位
          if (!this.toolCalls[idx]) {
            this.toolCalls[idx] = {
              id: tc.id || `call_${nanoid(8)}`,
              name: '',
              arguments: '',
              status: 'pending',
            }
          }

          const builder = this.toolCalls[idx]!
          if (tc.id) builder.id = tc.id
          if (tc.function?.name) builder.name = tc.function.name
          if (tc.function?.arguments) {
            builder.arguments = (builder.arguments || '') + tc.function.arguments
          }

          toolCallDeltas.push({
            index: idx,
            id: tc.id,
            name: tc.function?.name,
            arguments: tc.function?.arguments,
          })
        }

        chunk.toolCalls = toolCallDeltas
      }

      return Object.keys(chunk).length > 0 ? chunk : null
    } catch {
      // 忽略碎片 JSON 解析错误
      return null
    }
  }

  /**
   * 处理一个完整文本块（包含多行 SSE）
   *
   * @param text - 原始文本块
   * @param buffer - 上次未处理完的缓冲区
   * @returns [解析出的 StreamChunk 列表, 剩余缓冲区]
   */
  processChunk(text: string, buffer: string): [StreamChunk[], string] {
    const [lines, remaining] = splitSseLines(text, buffer)
    const chunks: StreamChunk[] = []

    for (const line of lines) {
      const chunk = this.processLine(line.data)
      if (chunk) chunks.push(chunk)
    }

    return [chunks, remaining]
  }

  /**
   * 获取当前累积的完整解析结果
   *
   * @returns 解析结果快照
   */
  getResult(): ParsedStreamResult {
    return {
      content: this.content,
      reasoning: this.reasoning,
      toolCalls: this.toolCalls
        .filter(Boolean)
        .map((tc) => ({
          id: tc!.id || `call_${nanoid(8)}`,
          name: tc!.name || '',
          arguments: tc!.arguments || '',
          status: 'pending' as const,
        })),
      finishReason: this.finishReason,
    }
  }

  /**
   * 重置解析器状态
   */
  reset(): void {
    this.content = ''
    this.reasoning = ''
    this.toolCalls = []
    this.finishReason = null
  }
}
