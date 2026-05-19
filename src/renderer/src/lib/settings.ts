const STORAGE_KEY = 'openx-api-base-url'
export const DEFAULT_BASE_URL = 'http://127.0.0.1:8000'

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
