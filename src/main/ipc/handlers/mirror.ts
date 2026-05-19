import type { IpcMainInvokeEvent, WebContents } from 'electron'
import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { startAndroidMirror, stopAndroidMirror } from '../../devices/android/mirror'
import type { MirrorOptions } from '../../devices/android/mirror'
import { parseDeviceRef, logErr } from '../../devices/device-ref'
import { IPC } from '../../../shared/ipc-channels'
import type { MirrorActionResult } from '../../../shared/mirror'
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
  if (win && !win.webContents.isDestroyed()) return win.webContents
  return fallback
}

export function handleOpenMirrorWindow(
  event: IpcMainInvokeEvent,
  deviceId: string,
): { ok: boolean; error?: string } {
  controllerSender = event.sender

  const ref = parseDeviceRef(deviceId)
  if (!ref) return { ok: false, error: '无效的设备 ID' }
  mirrorWindowSerial = ref.key

  const existing = getMirrorWindow()
  if (existing) {
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

  const query = { view: 'mirror', deviceId }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const url = new URL(process.env['ELECTRON_RENDERER_URL'])
    url.searchParams.set('view', 'mirror')
    url.searchParams.set('deviceId', deviceId)
    win.loadURL(url.toString())
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { query })
  }

  win.on('closed', () => {
    // Stop mirror if still running (user force-closed the window)
    if (mirrorWindowSerial) {
      stopAndroidMirror(mirrorWindowSerial)
      mirrorWindowSerial = null
    }
    mirrorWindow = null
    if (controllerSender && !controllerSender.isDestroyed()) {
      controllerSender.send(IPC.mirror.windowClosed)
    }
    controllerSender = null
    logger.debug('mirror window closed')
  })

  mirrorWindow = win
  logger.debug('mirror window opened for device %s', deviceId)
  return { ok: true }
}

export async function handleMirrorStart(
  event: IpcMainInvokeEvent,
  deviceId: string,
  options?: MirrorOptions,
): Promise<MirrorActionResult> {
  const ref = parseDeviceRef(deviceId)
  if (!ref || ref.platform !== 'android') {
    return { ok: false, error: '屏幕镜像仅支持 Android 设备' }
  }

  const sender = event.sender

  try {
    await startAndroidMirror(
      ref.key,
      options ?? {},
      (meta) => {
        fitMirrorWindowToDevice(meta.width, meta.height)
        if (!sender.isDestroyed()) {
          sender.send(IPC.mirror.metadata, meta)
        }
      },
      (data) => {
        const target = getFrameTarget(sender)
        if (!target.isDestroyed()) {
          target.send(IPC.mirror.frame, data)
        }
      },
      (err) => {
        if (!sender.isDestroyed()) {
          sender.send(IPC.mirror.error, err.message)
        }
      },
    )
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
  const ref = parseDeviceRef(deviceId)
  if (ref?.platform === 'android') {
    stopAndroidMirror(ref.key)
    logger.debug('mirror stopped', deviceId)
  }
}

