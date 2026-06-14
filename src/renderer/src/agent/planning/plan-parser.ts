/**
 * PlanParser - AI 响应解析
 *
 * 解析 AI 的流式/完整响应为结构化规划结果。
 * 对标 Midscene 的 planImpl 解析逻辑。
 *
 * 两种解析模式：
 * 1. Tool Calling 模式：从 tool_calls 中提取 PlanningAction（主流）
 * 2. 文本降级模式：从文本内容解析 [STEP] 结构（不支持 tools 的模型）
 */

import type { PlanningAction, ToolCall } from '../core/types'
import type { PlanningResult, ParsedStreamResult } from '../model/model-types'

/** [STEP] 行正则 */
const STEP_LINE_REGEX = /^\[STEP\]\s*(\{.*\})$/

/**
 * 从流式解析结果中提取规划动作
 *
 * 优先使用 tool_calls，无 tool_calls 时降级到文本解析。
 *
 * @param result - 一次完整 API 调用的流式解析结果
 * @returns 规划结果
 */
export function parsePlanningResult(result: ParsedStreamResult): PlanningResult {
  if (result.toolCalls.length > 0) {
    return parseFromToolCalls(result)
  }
  return parseFromText(result)
}

/**
 * 从 tool_calls 提取规划动作
 *
 * 每个 ToolCall 直接映射为一个 PlanningAction：
 * - name → actionType
 * - arguments → params
 * - toolCallId 保留用于后续关联
 */
function parseFromToolCalls(result: ParsedStreamResult): PlanningResult {
  const actions: PlanningAction[] = []

  for (const tc of result.toolCalls) {
    const action = toolCallToAction(tc)
    if (action) actions.push(action)
  }

  return {
    thought: result.reasoning || result.content,
    actions,
    shouldContinue: actions.length > 0,
    rawContent: result.content,
  }
}

/** 将单个 ToolCall 转为 PlanningAction */
function toolCallToAction(tc: ToolCall): PlanningAction | null {
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
function parseFromText(result: ParsedStreamResult): PlanningResult {
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
