import { BrowserWindow } from 'electron'
import { listAndroidDevices, startAndroidTracker } from './android'
import { listHarmonyDevices, startHarmonyTracker } from './harmony'

import type { UnifiedDevice } from './types'

export const CHANGED_CHANNEL = 'devices:list-changed' as const

let snapshot: UnifiedDevice[] = []
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let androidStop: (() => void) | null = null
let harmonyStop: (() => void) | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let started = false

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(CHANGED_CHANNEL, snapshot)
    }
  }
}

async function refresh(): Promise<void> {
  const [android, harmony] = await Promise.all([
    listAndroidDevices().catch(() => [] as UnifiedDevice[]),
    listHarmonyDevices().catch(() => [] as UnifiedDevice[])
  ])
  snapshot = [...android, ...harmony].sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
  broadcast()
}

function scheduleRefresh(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void refresh()
  }, 200)
}

export function getDevicesSnapshot(): UnifiedDevice[] {
  return snapshot
}

export async function startDeviceDiscovery(): Promise<void> {
  if (started) {
    return
  }
  started = true
  await refresh()

  const android = await startAndroidTracker(scheduleRefresh).catch(() => null)
  if (android) {
    androidStop = android.stop
  }

  const harmony = await startHarmonyTracker(scheduleRefresh).catch(() => null)
  if (harmony) {
    harmonyStop = harmony.stop
  }

  if (pollTimer === null) {
    pollTimer = setInterval(() => {
      scheduleRefresh()
    }, 5000)
  }
}

export function stopDeviceDiscovery(): void {
  started = false
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  androidStop?.()
  androidStop = null
  harmonyStop?.()
  harmonyStop = null
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  snapshot = []
}
