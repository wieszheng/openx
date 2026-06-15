/**
 * 模型每轮按如下结构输出，本模块用正则提取为结构化 PlanResult：
 *   <thought>...</thought>           思维/观察（必含）
 *   <log>...</log>                   面向用户的简短旁白
 *   <memory>...</memory>             需跨步保留的信息
 *   <action-type>Xxx</action-type>   下一步动作类型
 *   <action-param-json>{...}</action-param-json>
 *   <complete success="true|false">message</complete>  任务结束
 *   <error>...</error>               不可恢复错误
 */
import type { PlanResult, PlannedAction } from './types'

/** 提取首个 <tag>...</tag> 的内容（非贪婪，跨行） */
export function extractTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i')
  const m = xml.match(re)
  return m ? m[1].trim() : undefined
}

/**
 * 流式场景下的「容忍未闭合」提取：
 * - 已出现 </tag>：返回完整内容
 * - 只出现 <tag>：返回 <tag> 之后到目前为止的内容（不 trim 尾部，便于增量对比）
 * - 未出现：返回空串
 */
export function extractPartialTag(xml: string, tag: string): string {
  const open = xml.search(new RegExp(`<${tag}>`, 'i'))
  if (open < 0) return ''
  const after = xml.slice(open + tag.length + 2)
  const closeIdx = after.search(new RegExp(`</${tag}>`, 'i'))
  return closeIdx >= 0 ? after.slice(0, closeIdx) : after
}

/** 流式提取 <complete success="...">message 的 message 部分（容忍未闭合） */
export function extractPartialComplete(xml: string): string {
  const m = xml.match(/<complete\s+success="(?:true|false)">([\s\S]*?)(?:<\/complete>|$)/i)
  return m ? m[1] : ''
}


/**
 * 解析一次完整的模型输出。
 * @param strict 为 true 时，action-param-json 解析失败会抛错（供 loop 重试）。
 */
/**
 * 容错解析动作参数 JSON。模型（尤其 Qwen）常把 JSON 包在 ```json ``` 代码块里，
 * 或在花括号前后夹带说明文字，这里统一清洗后再解析。
 */
function parseParamJson(raw: string): Record<string, unknown> {
  let s = raw.trim()
  // 去掉 markdown 代码围栏
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  // 截取第一个 { 到最后一个 } 之间的内容
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first >= 0 && last > first) {
    s = s.slice(first, last + 1)
  }
  return JSON.parse(s)
}

export function parseXMLResponse(xml: string, strict = false): PlanResult {
  const thought = extractTag(xml, 'thought')
  const log = extractTag(xml, 'log')
  const memory = extractTag(xml, 'memory')
  const error = extractTag(xml, 'error')

  // <complete success="true">message</complete>
  const completeMatch = xml.match(/<complete\s+success="(true|false)">([\s\S]*?)<\/complete>/i)
  let finalize: PlanResult['finalize']
  if (completeMatch) {
    finalize = {
      success: completeMatch[1] === 'true',
      message: completeMatch[2]?.trim() || undefined
    }
  }

  // action
  let action: PlannedAction | undefined
  const actionTypeRaw = extractTag(xml, 'action-type')
  if (actionTypeRaw && actionTypeRaw.toLowerCase() !== 'null') {
    // 去掉模型可能泄漏的尾随标签，如 "Tap</action-type>..."
    const type = actionTypeRaw.split('<')[0].trim()
    const paramStr = extractTag(xml, 'action-param-json')
    let param: Record<string, unknown> = {}
    if (paramStr) {
      try {
        param = parseParamJson(paramStr)
      } catch (e) {
        if (strict) {
          throw new Error(`action-param-json 解析失败: ${(e as Error).message}`)
        }
        // 非严格模式：保留空参数，交由后续校验给出反馈
      }
    }
    if (type) action = { type, param }
  }

  // 模型同时给了 action 和 complete 时，以 action 优先（与 Midscene 相反，
  // 因为此处我们更希望继续推进；complete 只在没有 action 时生效）
  if (action && finalize) {
    finalize = undefined
  }

  return {
    ...(thought ? { thought } : {}),
    ...(log ? { log } : {}),
    ...(memory ? { memory } : {}),
    ...(action ? { action } : {}),
    ...(error ? { error } : {}),
    ...(finalize ? { finalize } : {})
  }
}
