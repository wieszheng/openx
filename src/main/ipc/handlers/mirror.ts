import type { IpcMainInvokeEvent, WebContents } from 'electron'
import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { startAndroidMirror, stopAndroidMirror } from '../../devices/android/mirror'
import { startHarmonyMirror, stopHarmonyMirror } from '../../devices/harmony/mirror'
import { parseDeviceRef, logErr } from '../../devices/device-ref'
import { IPC } from '../../../shared/ipc-channels'
import type { MirrorActionResult, MirrorOptions } from '../../../shared/mirror'
import { createLogger } from '../../log'

const logger = createLogger('ipc:mirror')

let mirrorWindow: BrowserWindow | null = null
// The main-window sender that called openWindow — receives windowClosed events
let controllerSender: WebContents | null = null
// Serial stored so we can stop the mirror when the window is force-closed
let mirrorWindowSerial: string | null = null

function getMirrorWindow(): BrowserWindow | null {
  if (mirrorWindow?.isDestroyed()) mirrorWindow = null
  return mirrorWindow
}

/**
 * Resize the mirror window so its content area matches the device's aspect
 * ratio, capped at 85 % of the primary display's work area.
 */
function fitMirrorWindowToDevice(deviceW: number, deviceH: number): void {
  const win = getMirrorWindow()
  if (!win || win.isDestroyed() || deviceW <= 0 || deviceH <= 0) return

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
  const maxW = Math.floor(screenW * 0.5)
  const maxH = Math.floor(screenH * 0.85)

  // Start from a target height of 720 px and scale width by aspect ratio.
  const ratio = deviceW / deviceH
  let h = Math.min(720, maxH)
  let w = Math.round(h * ratio)

  if (w > maxW) {
    w = maxW
    h = Math.round(w / ratio)
  }

  win.setContentSize(w, h)
  win.center()
  logger.debug('mirror window resized to %dx%d (device %dx%d)', w, h, deviceW, deviceH)
}

/** Returns the webContents that should receive frame packets. */
function getFrameTarget(fallback: WebContents): WebContents {
  const win = getMirrorWindow()
  if (win && !win.webContents.isDestroyed()) {
    return win.webContents
  }
  if (win && win.webContents.isDestroyed()) {
    logger.warn('getFrameTarget: mirror window webContents is destroyed, falling back to caller')
  }
  return fallback
}

export function handleOpenMirrorWindow(
  event: IpcMainInvokeEvent,
  deviceId: string,
): { ok: boolean; error?: string } {
  logger.info('openWindow requested', { deviceId })
  controllerSender = event.sender

  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    logger.warn('openWindow: invalid deviceId', deviceId)
    return { ok: false, error: '无效的设备 ID' }
  }
  mirrorWindowSerial = ref.key

  const existing = getMirrorWindow()
  if (existing) {
    logger.debug('openWindow: reusing existing window')
    existing.focus()
    return { ok: true }
  }

  const win = new BrowserWindow({
    width: 440,
    height: 900,
    minWidth: 240,
    minHeight: 400,
    title: '屏幕镜像',
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })
  logger.debug('openWindow: BrowserWindow created', { width: 440, height: 900 })

  const query = { view: 'mirror', deviceId }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const url = new URL(process.env['ELECTRON_RENDERER_URL'])
    url.searchParams.set('view', 'mirror')
    url.searchParams.set('deviceId', deviceId)
    logger.debug('openWindow: loading dev URL', url.toString())
    win.loadURL(url.toString())
  } else {
    logger.debug('openWindow: loading prod file with query', query)
    win.loadFile(join(__dirname, '../renderer/index.html'), { query })
  }

  win.on('closed', () => {
    // Stop mirror if still running (user force-closed the window)
    if (mirrorWindowSerial) {
      logger.debug('openWindow: window closed, stopping mirror for', mirrorWindowSerial)
      stopAndroidMirror(mirrorWindowSerial)
      stopHarmonyMirror(mirrorWindowSerial)
      mirrorWindowSerial = null
    }
    mirrorWindow = null
    if (controllerSender && !controllerSender.isDestroyed()) {
      controllerSender.send(IPC.mirror.windowClosed)
    } else if (controllerSender?.isDestroyed()) {
      logger.warn('openWindow: controllerSender destroyed, cannot send windowClosed')
    }
    controllerSender = null
    logger.debug('mirror window closed')
  })

  mirrorWindow = win
  logger.info('mirror window opened', { deviceId, platform: ref.platform })
  return { ok: true }
}

export async function handleMirrorStart(
  event: IpcMainInvokeEvent,
  deviceId: string,
  options?: MirrorOptions,
): Promise<MirrorActionResult> {
  logger.info('mirror start requested', { deviceId, options })

  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    logger.warn('mirror start: invalid deviceId', deviceId)
    return { ok: false, error: '无效的设备 ID' }
  }

  const sender = event.sender
  logger.debug('mirror start: sender id', sender.id, 'destroyed:', sender.isDestroyed())

  let frameCount = 0
  let lastFrameLog = Date.now()

  const onMeta = (meta: { deviceName: string; width: number; height: number }): void => {
    logger.info('mirror metadata received', meta)
    fitMirrorWindowToDevice(meta.width, meta.height)
    if (!sender.isDestroyed()) {
      sender.send(IPC.mirror.metadata, meta)
    } else {
      logger.warn('mirror: sender destroyed, cannot send metadata')
    }
  }
  const onData = (data: unknown): void => {
    const target = getFrameTarget(sender)
    if (target.isDestroyed()) {
      logger.warn('mirror: frame target destroyed, dropping frame')
      return
    }
    try {
      target.send(IPC.mirror.frame, data)
      frameCount++
      const now = Date.now()
      if (now - lastFrameLog >= 5000) {
        logger.debug('mirror: frames sent in last 5s', frameCount)
        frameCount = 0
        lastFrameLog = now
      }
    } catch (e) {
      logger.error('mirror: frame send failed', e instanceof Error ? e.message : String(e))
    }
  }
  const onError = (err: Error): void => {
    logger.warn('mirror: underlying error', err.message)
    if (!sender.isDestroyed()) {
      sender.send(IPC.mirror.error, err.message)
    } else {
      logger.warn('mirror: sender destroyed, cannot forward error to renderer')
    }
  }

  try {
    if (ref.platform === 'android') {
      logger.debug('mirror start: starting android mirror', ref.key)
      await startAndroidMirror(ref.key, options ?? {}, onMeta, onData, onError)
    } else if (ref.platform === 'harmony') {
      logger.debug('mirror start: starting harmony mirror', ref.key, { intervalMs: options?.intervalMs })
      await startHarmonyMirror(ref.key, { intervalMs: options?.intervalMs }, onMeta, onData, onError)
    } else {
      logger.warn('mirror start: unsupported platform', ref.platform)
      return { ok: false, error: '该平台暂不支持屏幕镜像' }
    }
    logger.info('mirror start: success', { deviceId, platform: ref.platform })
    return { ok: true }
  } catch (e) {
    const { errMessage } = logErr(e)
    logger.warn('mirror start failed', errMessage)
    return { ok: false, error: errMessage }
  }
}

export function handleMirrorStop(
  _event: IpcMainInvokeEvent,
  deviceId: string,
): void {
  logger.info('mirror stop requested', { deviceId })
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    logger.warn('mirror stop: invalid deviceId', deviceId)
    return
  }
  if (ref.platform === 'android') {
    stopAndroidMirror(ref.key)
  } else if (ref.platform === 'harmony') {
    stopHarmonyMirror(ref.key)
  }
  logger.info('mirror stopped', { deviceId, platform: ref.platform })
}

