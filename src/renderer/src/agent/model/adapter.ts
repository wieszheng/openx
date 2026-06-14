/**
 * ModelAdapter - 模型适配器接口
 *
 * 对标 Midscene 的 ModelAdapter 设计，抽象不同 AI 模型的差异。
 * 所有模型适配器（OpenAI、Gemini、通义等）必须实现此接口。
 *
 * 适配器负责：
 * - 发起聊天补全请求（流式）
 * - 解析 AI 响应为结构化规划结果
 * - 声明是否支持 function calling
 * - 优雅降级：不支持 tools 时自动回退到纯文本模式
 */

import type { PlanningResult } from './model-types'
import type { ChatCompletionParams } from './model-types'
import type { StreamChunk } from '../core/types'
import type { ParsedStreamResult } from './model-types'
import type { ModelConfig } from './model-types'

/** 模型适配器接口 */
export interface ModelAdapter {
  /** 模型配置 */
  config: ModelConfig

  /**
   * 发起流式聊天补全请求
   *
   * @param params - 聊天请求参数
   * @param signal - AbortSignal，用于取消请求
   * @returns AsyncGenerator，逐个产出流式增量片段
   * @throws 请求失败或被取消时抛出错误
   */
  chatCompletionStream(
    params: ChatCompletionParams,
    signal: AbortSignal,
  ): AsyncGenerator<StreamChunk>

  /**
   * 解析完整流式结果为结构化规划
   *
   * 当使用 function calling 时，从 toolCalls 中提取 PlanningAction；
   * 当为纯文本模式时，从 content 中解析 [STEP] 结构或 XML 格式。
   *
   * @param result - 流式解析结果
   * @returns 规划结果
   */
  parsePlanningResult(result: ParsedStreamResult): PlanningResult

  /**
   * 是否支持 function calling
   */
  supportsToolCalling(): boolean
}

/**
 * 判断 API 错误是否为不支持 tools 导致的
 *
 * @param status - HTTP 状态码
 * @param errorText - 响应体文本
 * @returns 是否为 tools 不支持错误
 */
export function isToolsUnsupportedError(status: number, errorText: string): boolean {
  return status === 400 && errorText.includes('tools')
}
