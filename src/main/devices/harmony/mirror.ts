import type { UiDriver } from 'hdckit'
import { getHdcClient } from './client'
import { createLogger } from '../../log'
import { logErr } from '../device-ref'
import type { MirrorMetadata, FramePacket, MirrorOptions } from '../../../shared/mirror'

const logger = createLogger('harmony:mirror')

const drivers = new Map<string, UiDriver>()
const capturing = new Set<string>()
const generations = new Map<string, number>()

async function getUiDriver(connectKey: string): Promise<UiDriver> {
  let driver = drivers.get(connectKey)
  if (!driver) {
    const target = getHdcClient().getTarget(connectKey)
    driver = await target.createUiDriver()
    drivers.set(connectKey, driver)
  }
  return driver
}

export async function startHarmonyMirror(
  connectKey: string,
  options: MirrorOptions,
  onMetadata: (meta: MirrorMetadata) => void,
  onData: (packet: FramePacket) => void,
  onError: (err: Error) => void,
): Promise<void> {
  const gen = (generations.get(connectKey) ?? 0) + 1
  generations.set(connectKey, gen)
  const isStale = (): boolean => generations.get(connectKey) !== gen

  // Stop and discard any existing session; new driver ensures clean captureScreenCallback
  await stopHarmonyMirror(connectKey)
  if (isStale()) return

  const driver = await getUiDriver(connectKey)
  if (isStale()) return

  await driver.start()
  if (isStale()) return

  try {
    const size: { width: number; height: number } = await driver.getDisplaySize()
    if (isStale()) return
    onMetadata({ deviceName: connectKey, width: size.width ?? 0, height: size.height ?? 0 })
  } catch (e) {
    if (isStale()) return
    logger.warn('getDisplaySize failed', logErr(e).errMessage)
    onMetadata({ deviceName: connectKey, width: 0, height: 0 })
  }

  if (isStale()) return
  capturing.add(connectKey)

  try {
    await driver.startCaptureScreen(
      (image: Buffer) => {
        if (!capturing.has(connectKey) || isStale()) return
        onData({ type: 'jpeg', data: image })
      },
      { scale: options.scale ?? 0.75 },
    )
    if (isStale()) {
      // Superseded after startCaptureScreen returned — clean up the just-started capture
      capturing.delete(connectKey)
      driver.stopCaptureScreen().catch(() => undefined)
      return
    }
    logger.info('harmony mirror started', connectKey)
  } catch (e) {
    capturing.delete(connectKey)
    if (!isStale()) {
      const err = e instanceof Error ? e : new Error(logErr(e).errMessage || String(e))
      logger.warn('startCaptureScreen failed', err.message)
      onError(err)
      throw err
    }
    // Stale — a newer call superseded this one; suppress the error
  }
}

export async function stopHarmonyMirror(connectKey: string): Promise<void> {
  capturing.delete(connectKey)
  const driver = drivers.get(connectKey)
  if (!driver) return
  // Discard from cache so the next start gets a fresh UiDriver instance with a
  // clean captureScreenCallback, preventing the "already started" race.
  drivers.delete(connectKey)
  try {
    await driver.stopCaptureScreen()
    logger.info('harmony mirror stopped', connectKey)
  } catch (e) {
    logger.warn('stopCaptureScreen failed', logErr(e).errMessage)
  }
  // Intentionally NOT calling driver.stop() to keep uitest daemon alive;
  // the next getUiDriver() creates a new instance that reuses the running daemon.
}

export async function disposeHarmonyMirrorDrivers(): Promise<void> {
  for (const key of [...capturing]) {
    await stopHarmonyMirror(key)
  }
  for (const [key, driver] of drivers) {
    try { await driver.stop() } catch { /* ignore */ }
    drivers.delete(key)
  }
}
