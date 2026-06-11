import { resolveJsonMode } from '../../../shared/llm-providers'
import { createLogger } from '../../log'
import { getLlmSettingsRaw } from '../../settings'

const logger = createLogger('agent:llm')

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function extractJson<T>(text: string): T | null {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed) as T
  } catch {
    /* continue */
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim()) as T
    } catch {
      /* continue */
    }
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as T
    } catch {
      /* continue */
    }
  }

  return null
}

function buildRequestBody(messages: LlmMessage[], stream: boolean): Record<string, unknown> {
  const cfg = getLlmSettingsRaw()
  const useJsonMode = resolveJsonMode(cfg.providerId, cfg.baseUrl)

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: useJsonMode
      ? messages
      : messages.map((m, i) =>
          i === 0 && m.role === 'system'
            ? { ...m, content: `${m.content}\n\n重要：只输出一个合法 JSON 对象，不要 markdown 代码块，不要额外说明。` }
            : m
        ),
    temperature: 0.2,
    stream,
  }
  if (useJsonMode) {
    body.response_format = { type: 'json_object' }
  }
  return body
}

function parseSseDelta(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return null
  const data = trimmed.slice(5).trim()
  if (data === '[DONE]') return null
  try {
    const json = JSON.parse(data) as {
      choices?: { delta?: { content?: string }; message?: { content?: string } }[]
    }
    const choice = json.choices?.[0]
    return choice?.delta?.content ?? choice?.message?.content ?? null
  } catch {
    return null
  }
}

export async function streamCompleteJson<T>(
  messages: LlmMessage[],
  onDelta: (delta: string) => void
): Promise<T | null> {
  const cfg = getLlmSettingsRaw()
  if (!cfg.enabled || !cfg.apiKey) return null

  const url = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`
  const body = buildRequestBody(messages, true)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    })

    if (!res.ok) {
      const text = await res.text()
      logger.warn('llm stream failed', { status: res.status, text: text.slice(0, 300) })
      return null
    }

    const reader = res.body?.getReader()
    if (!reader) return null

    const decoder = new TextDecoder()
    let buffer = ''
    let sseBuffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      sseBuffer += decoder.decode(value, { stream: true })
      const lines = sseBuffer.split('\n')
      sseBuffer = lines.pop() ?? ''

      for (const line of lines) {
        const delta = parseSseDelta(line)
        if (delta) {
          buffer += delta
          onDelta(delta)
        }
      }
    }

    if (sseBuffer.trim()) {
      const delta = parseSseDelta(sseBuffer)
      if (delta) {
        buffer += delta
        onDelta(delta)
      }
    }

    if (!buffer) return null
    return extractJson<T>(buffer)
  } catch (e) {
    logger.warn('llm stream error', { error: e instanceof Error ? e.message : String(e) })
    return null
  }
}

export async function completeJson<T>(messages: LlmMessage[]): Promise<T | null> {
  const cfg = getLlmSettingsRaw()
  if (!cfg.enabled || !cfg.apiKey) return null

  const url = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`
  const body = buildRequestBody(messages, false)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    })

    if (!res.ok) {
      const text = await res.text()
      logger.warn('llm request failed', { status: res.status, text: text.slice(0, 300) })
      return null
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
      error?: { message?: string }
    }

    if (json.error?.message) {
      logger.warn('llm api error', { message: json.error.message })
      return null
    }

    const content = json.choices?.[0]?.message?.content
    if (!content) return null
    return extractJson<T>(content)
  } catch (e) {
    logger.warn('llm error', { error: e instanceof Error ? e.message : String(e) })
    return null
  }
}
