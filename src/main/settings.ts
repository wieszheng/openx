import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { DEFAULT_LLM_SETTINGS, type LlmSettings } from '../shared/agent'

interface AppSettings {
  exportDir?: string
  globalVars?: Record<string, string>
  llm?: LlmSettings
}

function settingsPath(): string {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'app-settings.json')
}

function load(): AppSettings {
  const p = settingsPath()
  if (!existsSync(p)) return {}
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as AppSettings
  } catch {
    return {}
  }
}

function save(data: AppSettings): void {
  writeFileSync(settingsPath(), JSON.stringify(data, null, 2), 'utf-8')
}

let cache: AppSettings | null = null

function get(): AppSettings {
  if (!cache) cache = load()
  return cache
}

function set(patch: Partial<AppSettings>): void {
  cache = { ...get(), ...patch }
  save(cache)
}

export function getExportDir(): string | null {
  return get().exportDir ?? null
}

export function setExportDir(dir: string): void {
  set({ exportDir: dir || undefined })
}

// ── Global Variables ──────────────────────────────────────────────────────

export function getAllGlobalVars(): Record<string, string> {
  return { ...(get().globalVars ?? {}) }
}

export function getGlobalVar(key: string): string | undefined {
  return get().globalVars?.[key]
}

export function setGlobalVar(key: string, value: string): void {
  const vars = get().globalVars ?? {}
  set({ globalVars: { ...vars, [key]: value } })
}

export function deleteGlobalVar(key: string): void {
  const vars = { ...(get().globalVars ?? {}) }
  delete vars[key]
  set({ globalVars: vars })
}

// ── LLM Settings ──────────────────────────────────────────────────────────

export function getLlmSettings(): LlmSettings {
  const stored = get().llm
  return {
    ...DEFAULT_LLM_SETTINGS,
    ...stored,
    apiKey: stored?.apiKey ? '***' : undefined,
  }
}

export function getLlmSettingsRaw(): LlmSettings {
  return { ...DEFAULT_LLM_SETTINGS, ...get().llm }
}

export function setLlmSettings(patch: Partial<LlmSettings>): void {
  const current = get().llm ?? {}
  const next: LlmSettings = { ...DEFAULT_LLM_SETTINGS, ...current }
  if (patch.providerId !== undefined) next.providerId = patch.providerId
  if (patch.baseUrl !== undefined) next.baseUrl = patch.baseUrl
  if (patch.model !== undefined) next.model = patch.model
  if (patch.enabled !== undefined) next.enabled = patch.enabled
  if (patch.apiKey !== undefined && patch.apiKey !== '***') {
    next.apiKey = patch.apiKey || undefined
  }
  set({ llm: next })
}
