import { autoUpdater } from 'electron-updater'
import { ipcMain, type BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import { IPC } from '../../../shared/ipc-channels'
import { createLogger } from '../../log'

const logger = createLogger('updater')

export function initUpdater(getMainWindow: () => BrowserWindow | null): void {
  autoUpdater.logger = logger
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  const send = (channel: string, payload?: unknown): void => {
    getMainWindow()?.webContents.send(channel, payload)
  }

  autoUpdater.on('checking-for-update', () => {
    send(IPC.updater.checking)
  })

  autoUpdater.on('update-available', (info) => {
    send(IPC.updater.available, {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', () => {
    send(IPC.updater.notAvailable)
  })

  autoUpdater.on('download-progress', (progress) => {
    send(IPC.updater.progress, { percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', () => {
    send(IPC.updater.downloaded)
  })

  autoUpdater.on('error', (err) => {
    logger.error('updater error', err)
    send(IPC.updater.error, { message: err.message })
  })

  ipcMain.on(IPC.updater.check, () => {
    autoUpdater.checkForUpdates().catch((err) => logger.error('check failed', err))
  })

  ipcMain.on(IPC.updater.download, () => {
    autoUpdater.downloadUpdate().catch((err) => logger.error('download failed', err))
  })

  ipcMain.on(IPC.updater.install, () => {
    autoUpdater.quitAndInstall()
  })

  // 生产环境启动后 3 秒自动检查一次
  if (!is.dev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => logger.error('auto check failed', err))
    }, 3000)
  }
}
