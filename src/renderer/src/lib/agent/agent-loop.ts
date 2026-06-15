/**
 * 单步 ReAct 主循环：每轮调用 LLM 规划一个动作 → 执行 → 把结果喂回 → 重新规划，
 * 直到模型输出 <complete> 或达到最大轮次。通过 onEvent 把过程推给 UI，
 * 本身不依赖 React，可独立测试/复用。
 */
import { nanoid } from 'nanoid'
import type { AgentEventHandler, PlanResult } from './types'
import { ConversationHistory } from './conversation-history'
import type { ChatMessage } from './conversation-history'
import { parseXMLResponse, extractPartialTag, extractPartialComplete } from './xml-protocol'
import { buildSystemPrompt } from './prompts'
import { getActionCategory } from './action-space'
import { ToolRuntime } from './tool-runtime'

export interface AgentLoopConfig {
  apiKey: string
  baseUrl: string
  model: string
  interactive: boolean
  toolRuntime: ToolRuntime
  onEvent: AgentEventHandler
  /** 历史中最多保留的截图数（防 token 爆炸） */
  maxImages?: number
  maxTurns?: number
}

const HISTORY_COMPRESS_THRESHOLD = 40
const HISTORY_KEEP_COUNT = 16
const MAX_ERROR_PER_RUN = 5

/**
 * 会改变界面、但执行后通常不回传新截图的动作。这类动作执行后，历史里残留的
 * 截图是「动作前」的旧画面——必须提醒模型：不要凭旧图判断是否生效，要先重新感知。
 */
const UI_MUTATING_ACTIONS = new Set([
  'action-tap',
  'action-double-tap',
  'action-long-click',
  'action-swipe',
  'action-drag',
  'action-input-text',
  'action-clear-text',
  'action-key-event',
  'action-find-and-tap',
  'action-launch-app',
  'action-close-app'
])


export class AgentLoop {
  private readonly history = new ConversationHistory()
  private abortController: AbortController | null = null

  constructor(private readonly config: AgentLoopConfig) {}

  abort(): void {
    this.abortController?.abort()
  }

  /** 跑一次完整任务（用户输入一条 prompt 触发） */
  async run(userPrompt: string): Promise<void> {
    const { onEvent } = this.config
    const maxTurns = this.config.maxTurns ?? 50
    const maxImages = this.config.maxImages ?? 2

    this.abortController = new AbortController()
    const signal = this.abortController.signal

    // 首条用户消息进入历史
    this.history.append({ role: 'user', content: userPrompt })

    let turn = 0
    let errorCount = 0
    let emptyCount = 0

    try {
      while (turn < maxTurns) {
        if (signal.aborted) {
          onEvent({ type: 'aborted', messageId: '' })
          return
        }

        const messageId = nanoid()
        onEvent({ type: 'turn-start', messageId })

        // 1. 组装请求并流式调用
        const { thought, content, rawXml } = await this.callModel(messageId, maxImages, signal)

        // 把模型本轮原始输出写入历史（assistant 角色）
        this.history.append({ role: 'assistant', content: rawXml })
        onEvent({ type: 'turn-end', messageId })

        // 2. 解析 XML
        const plan = parseXMLResponse(rawXml)

        // 3. 完成信号
        if (plan.finalize) {
          onEvent({ type: 'complete', messageId, finalize: plan.finalize })
          return
        }

        // 4. 错误信号
        if (plan.error && !plan.action) {
          errorCount++
          if (errorCount > MAX_ERROR_PER_RUN) {
            onEvent({ type: 'error', messageId, text: `连续错误过多，已停止：${plan.error}` })
            return
          }
          this.history.pendingFeedbackMessage = `上一轮报告错误：${plan.error}。请尝试换一种方式恢复。`
          turn++
          continue
        }

        // 5. 执行动作
        if (plan.action) {
          emptyCount = 0
          await this.runAction(messageId, plan, signal)
          turn++
          continue
        }

        // 6. 既无动作也无完成 —— 可能是模型本轮只输出了思考。
        //    给一次重试机会（提示其按格式输出动作），连续两次才视为结束。
        if (!rawXml.trim() || emptyCount >= 1) {
          onEvent({
            type: 'complete',
            messageId,
            finalize: { success: true, message: content || thought || '规划完成。' }
          })
          return
        }
        emptyCount++
        this.history.pendingFeedbackMessage =
          '你上一轮没有输出有效的 <action-type>/<action-param-json> 或 <complete>。请严格按格式输出下一步动作，或在任务完成时输出 <complete success="true">。'
        turn++
        continue
      }

      // 超出最大轮次
      onEvent({ type: 'error', messageId: '', text: `已达最大交互轮次（${maxTurns}），停止执行。` })
    } catch (err) {
      if ((err as Error).name === 'AbortError' || signal.aborted) {
        onEvent({ type: 'aborted', messageId: '' })
        return
      }
      onEvent({ type: 'error', messageId: '', text: (err as Error).message || String(err) })
    } finally {
      this.abortController = null
    }
  }

  // PLACEHOLDER_METHODS

  /** 执行一个动作并把结果喂回历史 */
  private async runAction(
    messageId: string,
    plan: PlanResult,
    signal: AbortSignal
  ): Promise<void> {
    const { onEvent, toolRuntime } = this.config
    const action = plan.action!
    const toolId = nanoid()
    const category = getActionCategory(action.type)
    const argsStr = JSON.stringify(action.param)

    onEvent({
      type: 'tool-start',
      messageId,
      tool: { id: toolId, name: action.type, arguments: argsStr, status: 'pending', category }
    })

    const { result, screenshot } = await toolRuntime.execute(action, signal)
    const isError = !!(result as { error?: unknown }).error
    const resultStr = JSON.stringify(result)

    onEvent({
      type: 'tool-end',
      messageId,
      tool: {
        id: toolId,
        name: action.type,
        arguments: argsStr,
        status: isError ? 'error' : 'success',
        result: resultStr,
        screenshot,
        category
      }
    })

    // 记录已执行步骤 / 记忆，喂回下一轮
    if (plan.log) this.history.appendHistoricalLog(plan.log)
    if (plan.memory) this.history.appendMemory(plan.memory)

    const feedback = `动作 [${action.type}] 执行结果：${resultStr}`

    // 若动作返回了截图，作为下一轮的视觉输入注入历史
    if (screenshot) {
      this.history.append({
        role: 'user',
        content: [
          { type: 'text', text: feedback },
          { type: 'image_url', image_url: { url: screenshot, detail: 'high' } }
        ]
      })
    } else {
      // 无新截图：若刚执行的是会改变界面的动作，历史里的图是「动作前」旧画面。
      // 必须强提示模型重新感知，杜绝它凭旧图臆断"界面没变/已生效"而误判误回退。
      const needReperceive = UI_MUTATING_ACTIONS.has(action.type) && !isError
      this.history.pendingFeedbackMessage = needReperceive
        ? `${feedback}\n\n⚠️ 重要：本步未返回新截图，历史中的截图是【本动作执行之前】的旧画面，不能据此判断本次操作是否生效。要确认界面是否发生预期变化，你【必须】先调用 get_device_screenshot 或 get_ocr_result 获取最新画面，再做判断。在重新感知之前，禁止断言"界面未变化"、禁止 remove_last_nodes 回退。`
        : feedback
    }
  }

  /** 组装消息、流式调用 LLM，实时通过 onEvent 推送增量；返回累计文本 */
  private async callModel(
    messageId: string,
    maxImages: number,
    signal: AbortSignal
  ): Promise<{ thought: string; content: string; rawXml: string }> {
    const { apiKey, baseUrl, model, interactive, onEvent } = this.config

    // 历史超长则压缩
    this.history.compressHistory(HISTORY_COMPRESS_THRESHOLD, HISTORY_KEEP_COUNT)

    const systemPrompt = buildSystemPrompt(interactive)
    const apiMessages = this.history.snapshot(maxImages)

    // 把 pendingFeedback 作为最后一条 user 消息附加（不污染持久历史）
    const pending = this.history.consumePendingFeedback()
    const memoriesText = this.history.memoriesToText()
    const logsText = this.history.historicalLogsToText()
    const trailingParts: string[] = []
    if (pending) trailingParts.push(pending)
    if (memoriesText) trailingParts.push(memoriesText)
    if (logsText) trailingParts.push(logsText)
    const trailing: ChatMessage[] = trailingParts.length
      ? [{ role: 'user', content: trailingParts.join('\n\n') }]
      : []

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...apiMessages,
      ...trailing
    ]

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, stream: true }),
      signal
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`API 请求出错 (${response.status}): ${errText || response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('流式数据读取失败')

    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let content = '' // 模型原始 XML 全文
    let lastThought = ''
    let lastUserText = ''

    // 把累计的原始 XML 解析为「思维链片段」和「面向用户文本」，以快照方式推给 UI
    const emitParsed = (): void => {
      const thought = extractPartialTag(content, 'thought')
      if (thought && thought !== lastThought) {
        lastThought = thought
        onEvent({ type: 'thought', messageId, text: thought })
      }
      // 面向用户的正文 = <log> 或 <complete> 的 message
      const userText = extractPartialTag(content, 'log') || extractPartialComplete(content)
      if (userText && userText !== lastUserText) {
        lastUserText = userText
        onEvent({ type: 'content', messageId, text: userText })
      }
    }

    const processLine = (line: string): void => {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) return
      try {
        const json = JSON.parse(trimmed.slice(6))
        const delta = json.choices?.[0]?.delta
        if (!delta) return
        if (delta.content) {
          content += delta.content
          emitParsed()
        }
        if (delta.reasoning_content) {
          onEvent({ type: 'reasoning', messageId, text: delta.reasoning_content })
        }
      } catch {
        // 忽略碎片 JSON
      }
    }

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) processLine(line)
    }
    if (buffer.trim()) processLine(buffer)
    emitParsed()

    // content 即模型本轮的原始 XML 输出
    return { thought: lastThought, content: lastUserText, rawXml: content }
  }
}
