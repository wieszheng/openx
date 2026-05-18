import { ipcMain, type BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { getDevicesSnapshot } from '../devices'
import { createLogger, getLogPath } from '../log'
import {
  handleAppsList,
  handleAppsStart,
  handleAppsStop,
  handleAppsUninstall,
  handleAppsInstall
} from './handlers/apps'

const logger = createLogger('ipc')

export interface RegisterIpcOptions {
  getMainWindow: () => BrowserWindow | null
}

/** 统一注册所有 IPC 通道（唯一入口） */
export function registerIpc({ getMainWindow }: RegisterIpcOptions): void {
  // ── Window ──────────────────────────────────────────────────────────────
  ipcMain.on(IPC.window.minimize, () => {
    getMainWindow()?.minimize()
  })

  ipcMain.on(IPC.window.maximize, () => {
    const win = getMainWindow()
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on(IPC.window.close, () => {
    getMainWindow()?.close()
  })

  ipcMain.handle(IPC.window.isMaximized, () => {
    return getMainWindow()?.isMaximized() ?? false
  })

  // ── Devices ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.devices.list, () => getDevicesSnapshot())

  // ── Shell ───────────────────────────────────────────────────────────────
  // ipcMain.handle(IPC.shell.exec, handleShellExec)

  // ── Apps ────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.apps.list, handleAppsList)
  ipcMain.handle(IPC.apps.start, handleAppsStart)
  ipcMain.handle(IPC.apps.stop, handleAppsStop)
  ipcMain.handle(IPC.apps.uninstall, handleAppsUninstall)
  ipcMain.handle(IPC.apps.install, handleAppsInstall)

  // ── Screencap ───────────────────────────────────────────────────────────
  // ipcMain.handle(IPC.screencap.capture, handleScreencap)

  // ── Mirror ──────────────────────────────────────────────────────────────
  // ipcMain.handle(IPC.mirror.openWindow, handleOpenMirrorWindow)
  // ipcMain.handle(IPC.mirror.start, handleMirrorStart)
  // ipcMain.handle(IPC.mirror.stop, handleMirrorStop)

  // ── Log ─────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.log.getPath, () => getLogPath())

  // ── Debug ───────────────────────────────────────────────────────────────
  ipcMain.on(IPC.debug.ping, () => logger.debug('pong'))

  logger.info('ipc registered')
}
