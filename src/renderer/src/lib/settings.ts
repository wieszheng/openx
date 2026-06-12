const STORAGE_KEY = 'openx-api-base-url'
export const DEFAULT_BASE_URL = 'http://127.0.0.1:8000'

const AI_KEY_STORAGE = 'openx-ai-api-key'
const AI_BASE_URL_STORAGE = 'openx-ai-base-url'
const AI_MODEL_STORAGE = 'openx-ai-model'

export const DEFAULT_AI_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
export const DEFAULT_AI_MODEL = 'qwen-plus'

export function getBaseUrl(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)?.trim()
    if (raw) return raw.replace(/\/$/, '')
  } catch {
    /* ignore */
  }
  return DEFAULT_BASE_URL
}

export function setBaseUrl(url: string): void {
  const normalized = url.trim().replace(/\/$/, '')
  localStorage.setItem(STORAGE_KEY, normalized)
}

export function getAiApiKey(): string {
  try {
    return localStorage.getItem(AI_KEY_STORAGE)?.trim() || ''
  } catch {
    return ''
  }
}

export function setAiApiKey(key: string): void {
  localStorage.setItem(AI_KEY_STORAGE, key.trim())
}

export function getAiBaseUrl(): string {
  try {
    const raw = localStorage.getItem(AI_BASE_URL_STORAGE)?.trim()
    if (raw) return raw.replace(/\/$/, '')
  } catch {
    /* ignore */
  }
  return DEFAULT_AI_BASE_URL
}

export function setAiBaseUrl(url: string): void {
  const normalized = url.trim().replace(/\/$/, '')
  localStorage.setItem(AI_BASE_URL_STORAGE, normalized)
}

export function getAiModel(): string {
  try {
    return localStorage.getItem(AI_MODEL_STORAGE)?.trim() || DEFAULT_AI_MODEL
  } catch {
    return DEFAULT_AI_MODEL
  }
}

export function setAiModel(model: string): void {
  localStorage.setItem(AI_MODEL_STORAGE, model.trim())
}

export function resetAiSettings(): void {
  localStorage.removeItem(AI_KEY_STORAGE)
  localStorage.removeItem(AI_BASE_URL_STORAGE)
  localStorage.removeItem(AI_MODEL_STORAGE)
}

export function resetBaseUrl(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export async function testBackendConnection(
  baseUrl: string,
): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  const url = baseUrl.trim().replace(/\/$/, '')
  const start = Date.now()
  try {
    const res = await fetch(`${url}/api/global-variables?page=1&page_size=1`, {
      signal: AbortSignal.timeout(8000),
    })
    const latencyMs = Date.now() - start
    if (res.ok) {
      return { ok: true, message: '连接成功', latencyMs }
    }
    return { ok: false, message: `HTTP ${res.status}`, latencyMs }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}
