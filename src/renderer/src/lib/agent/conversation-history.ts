/**
 *  - 维护发给 OpenAI 兼容接口的多轮消息数组
 *  - 累积 memory（跨步关键信息）与 historicalLog（已执行步骤）
 *  - pendingFeedbackMessage：上一步动作结果，喂给下一轮规划
 *  - snapshot(maxImages)：裁掉过多的历史截图，防止 token 爆炸
 *  - compressHistory：消息过长时折叠最早的若干条
 */

/** OpenAI 兼容的消息内容片段 */
export type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'high' | 'low' | 'auto' } }

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | MessageContentPart[]
}

export class ConversationHistory {
  private messages: ChatMessage[] = []
  private memories: string[] = []
  private historicalLogs: string[] = []

  /** 上一步动作执行结果，下一轮规划会消费并清空 */
  public pendingFeedbackMessage = ''

  append(message: ChatMessage): void {
    this.messages.push(message)
  }

  reset(): void {
    this.messages = []
    this.memories = []
    this.historicalLogs = []
    this.pendingFeedbackMessage = ''
  }

  consumePendingFeedback(): string {
    const msg = this.pendingFeedbackMessage
    this.pendingFeedbackMessage = ''
    return msg
  }

  appendMemory(memory: string): void {
    if (memory) this.memories.push(memory)
  }

  memoriesToText(): string {
    if (this.memories.length === 0) return ''
    return `已记录的关键信息：\n---\n${this.memories.join('\n---\n')}\n`
  }

  appendHistoricalLog(log: string): void {
    if (log) this.historicalLogs.push(log)
  }

  historicalLogsToText(): string {
    if (this.historicalLogs.length === 0) return ''
    const lines = this.historicalLogs.map((l) => `- ${l}`).join('\n')
    return `已执行的步骤：\n${lines}`
  }

  get length(): number {
    return this.messages.length
  }

  /**
   * 快照当前消息；从后往前保留最多 maxImages 张图，更早的图片替换为占位文本。
   * maxImages 为 undefined 时不限制。
   */
  snapshot(maxImages?: number): ChatMessage[] {
    if (maxImages === undefined) {
      return [...this.messages]
    }
    const cloned: ChatMessage[] = JSON.parse(JSON.stringify(this.messages))
    let imageCount = 0
    for (let i = cloned.length - 1; i >= 0; i--) {
      const content = cloned[i].content
      if (!Array.isArray(content)) continue
      for (let j = 0; j < content.length; j++) {
        const item = content[j]
        if (item.type === 'image_url') {
          imageCount++
          if (imageCount > maxImages) {
            content[j] = { type: 'text', text: '(为节省 token，此截图已省略)' }
          }
        }
      }
    }
    return cloned
  }

  /**
   * 消息数超过 threshold 时，仅保留最近 keepCount 条，其余折叠为一条占位消息。
   * @returns 是否进行了压缩
   */
  compressHistory(threshold: number, keepCount: number): boolean {
    if (this.messages.length <= threshold) return false
    const omitted = this.messages.length - keepCount
    const placeholder: ChatMessage = {
      role: 'user',
      content: `（已省略 ${omitted} 条更早的对话消息）`
    }
    const recent = this.messages.slice(-keepCount)
    this.messages = [placeholder, ...recent]
    return true
  }
}
