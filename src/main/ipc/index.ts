import { ipcMain, type BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { getDevicesSnapshot } from '../devices'
import { createLogger, getLogPath } from '../log'
import {
  handleAppsList,
  handleAppsStart,
  handleAppsStop,
  handleAppsUninstall,
  handleAppsInstall,
  handleAppsClearData,
  handleAppsClearCache,
  handleAppsDisable,
  handleAppsEnable
} from './handlers/apps'
import { handleScreencap } from './handlers/screencap'
import { handleFilesList, handleFilesDownload, handleFilesUpload, handleFilesDelete, handleFilesCreateDir } from './handlers/files'
import { handleMirrorStart, handleMirrorStop, handleOpenMirrorWindow } from './handlers/mirror'
import { getToolkitStatus } from './handlers/toolkit'
import {
  handleOpenFolder, handleOpenFile, handleGetExportDir, handleSetExportDir,
  handleGetLlmSettings, handleSetLlmSettings,
} from './handlers/settings'
import { handleRecordStart, handleRecordStop } from './handlers/record'
import { handleLogRead } from './handlers/log'
import { createWorkflowHandlers } from './handlers/workflow'
import { createAgentHandlers } from './handlers/agent'

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
  ipcMain.handle(IPC.apps.clearData, handleAppsClearData)
  ipcMain.handle(IPC.apps.clearCache, handleAppsClearCache)
  ipcMain.handle(IPC.apps.disable, handleAppsDisable)
  ipcMain.handle(IPC.apps.enable, handleAppsEnable)
  
  // ── Files ───────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.files.list, handleFilesList)
  ipcMain.handle(IPC.files.download, handleFilesDownload)
  ipcMain.handle(IPC.files.upload, handleFilesUpload)
  ipcMain.handle(IPC.files.delete, handleFilesDelete)
  ipcMain.handle(IPC.files.mkdir, handleFilesCreateDir)


  // ── Screencap ───────────────────────────────────────────────────────────
  ipcMain.handle(IPC.screencap.capture, handleScreencap)

  // ── Mirror ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.mirror.openWindow, handleOpenMirrorWindow)
  ipcMain.handle(IPC.mirror.start, handleMirrorStart)
  ipcMain.handle(IPC.mirror.stop, handleMirrorStop)
  
  // ── Record ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.record.start, handleRecordStart)
  ipcMain.handle(IPC.record.stop, handleRecordStop)

  // ── Toolkit ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.toolkit.status, () => getToolkitStatus())

  // ── Log ─────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.log.getPath, () => getLogPath())
  ipcMain.handle(IPC.log.read, handleLogRead)

  // ── Dialog ───────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.dialog.openFolder, () => handleOpenFolder(getMainWindow))
  ipcMain.handle(IPC.dialog.openFile, () => handleOpenFile(getMainWindow))

  // ── Settings ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.settings.getExportDir, handleGetExportDir)
  ipcMain.handle(IPC.settings.setExportDir, handleSetExportDir)
  ipcMain.handle(IPC.settings.getLlm, handleGetLlmSettings)
  ipcMain.handle(IPC.settings.setLlm, handleSetLlmSettings)

  // ── Workflow ───────────────────────────────────────────────────
  const { handleWorkflowRun, handleWorkflowRunNode, handleWorkflowStop } = createWorkflowHandlers(getMainWindow)
  ipcMain.handle(IPC.workflow.run, handleWorkflowRun)
  ipcMain.handle(IPC.workflow.runNode, handleWorkflowRunNode)
  ipcMain.on(IPC.workflow.stop, handleWorkflowStop)

  // ── Agent ─────────────────────────────────────────────────────────────────
  const {
    handleAgentStart,
    handleAgentPause,
    handleAgentResume,
    handleAgentStep,
    handleAgentStop,
    handleAgentGetSession,
    handleAgentPlan,
    handleAgentApplyRepair,
  } = createAgentHandlers(getMainWindow)
  ipcMain.handle(IPC.agent.plan, handleAgentPlan)
  ipcMain.handle(IPC.agent.applyRepair, handleAgentApplyRepair)
  ipcMain.handle(IPC.agent.start, handleAgentStart)
  ipcMain.handle(IPC.agent.pause, handleAgentPause)
  ipcMain.handle(IPC.agent.resume, handleAgentResume)
  ipcMain.handle(IPC.agent.step, handleAgentStep)
  ipcMain.on(IPC.agent.stop, handleAgentStop)
  ipcMain.handle(IPC.agent.getSession, handleAgentGetSession)

  // ── Debug ───────────────────────────────────────────────────────────────
  ipcMain.on(IPC.debug.ping, () => logger.debug('pong'))

  logger.info('ipc registered')
}
