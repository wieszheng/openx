import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

interface AppSettings {
  exportDir?: string
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
