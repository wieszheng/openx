import { BrowserWindow } from 'electron'
import { listAndroidDevices, startAndroidTracker } from './android'
import { listHarmonyDevices, startHarmonyTracker } from './harmony'

import type { UnifiedDevice } from '../../shared/unified-device'
import { IPC } from '../../shared/ipc-channels'
import { createLogger } from '../log'

const logger = createLogger('orchestrator')

let snapshot: UnifiedDevice[] = []
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let androidStop: (() => void) | null = null
let harmonyStop: (() => void) | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let started = false

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.devices.listChanged, snapshot)
    }
  }
}

async function refresh(): Promise<void> {
  const [android, harmony] = await Promise.all([
    listAndroidDevices().catch((e) => {
      logger.warn('listAndroidDevices failed', e)
      return [] as UnifiedDevice[]
    }),
    listHarmonyDevices().catch((e) => {
      logger.warn('listHarmonyDevices failed', e)
      return [] as UnifiedDevice[]
    })
  ])
  snapshot = [...android, ...harmony].sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
  logger.debug('devices refreshed', {
    android: android.length,
    harmony: harmony.length,
    total: snapshot.length
  })
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
  logger.info('device discovery starting')
  await refresh()

  const android = await startAndroidTracker(scheduleRefresh).catch((e) => {
    logger.warn('android tracker failed to start', e)
    return null
  })
  if (android) {
    androidStop = android.stop
  }

  const harmony = await startHarmonyTracker(scheduleRefresh).catch((e) => {
    logger.warn('harmony tracker failed to start', e)
    return null
  })
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
  logger.info('device discovery stopping')
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
