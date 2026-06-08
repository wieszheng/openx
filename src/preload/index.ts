import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '../shared/ipc-channels'
import type {
  AppActionResult,
  AppsListResult,
  ListAppsOptions,
  ScreencapResult,
  StartAppPayload
} from '../shared/device-app'
import type { UnifiedDevice } from '../shared/unified-device'
import type { MirrorActionResult, MirrorMetadata, MirrorOptions, FramePacket } from '../shared/mirror'
import { ToolkitStatusResult } from '../shared/toolkit-status'
import { RecordStartResult, RecordStopResult } from '../shared/record'
import type { FileListResult, FileDownloadResult, FileUploadResult, FileDeleteResult, FileMkdirResult } from '../shared/files'


// Custom APIs for renderer
const api = {
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized')
  },
  devices: {
    list: (): Promise<UnifiedDevice[]> => ipcRenderer.invoke('devices:list'),
    onListChanged: (cb: (devices: UnifiedDevice[]) => void): (() => void) => {
      const channel = 'devices:list-changed'
      const listener = (_event: Electron.IpcRendererEvent, devices: UnifiedDevice[]): void => {
        cb(devices)
      }
      ipcRenderer.on(channel, listener)
      return () => {
        ipcRenderer.removeListener(channel, listener)
      }
    }
  },
  apps: {
    list: (deviceId: string, options?: ListAppsOptions): Promise<AppsListResult> =>
      ipcRenderer.invoke(IPC.apps.list, deviceId, options),
    start: (deviceId: string, payload: StartAppPayload): Promise<AppActionResult> =>
      ipcRenderer.invoke(IPC.apps.start, deviceId, payload),
    stop: (deviceId: string, packageName: string): Promise<AppActionResult> =>
      ipcRenderer.invoke(IPC.apps.stop, deviceId, packageName),
    uninstall: (deviceId: string, packageName: string): Promise<AppActionResult> =>
      ipcRenderer.invoke(IPC.apps.uninstall, deviceId, packageName),
    install: (deviceId: string): Promise<AppActionResult> =>
      ipcRenderer.invoke(IPC.apps.install, deviceId),
    clearData: (deviceId: string, packageName: string): Promise<AppActionResult> =>
      ipcRenderer.invoke(IPC.apps.clearData, deviceId, packageName),
    clearCache: (deviceId: string, packageName: string): Promise<AppActionResult> =>
      ipcRenderer.invoke(IPC.apps.clearCache, deviceId, packageName),
    disable: (deviceId: string, packageName: string): Promise<AppActionResult> =>
      ipcRenderer.invoke(IPC.apps.disable, deviceId, packageName),
    enable: (deviceId: string, packageName: string): Promise<AppActionResult> =>
      ipcRenderer.invoke(IPC.apps.enable, deviceId, packageName)
  },
  screencap: {
    capture: (deviceId: string): Promise<ScreencapResult> =>
      ipcRenderer.invoke(IPC.screencap.capture, deviceId)
  },
  mirror: {
    start: (deviceId: string, options?: MirrorOptions): Promise<MirrorActionResult> =>
      ipcRenderer.invoke(IPC.mirror.start, deviceId, options),
    stop: (deviceId: string): Promise<void> =>
      ipcRenderer.invoke(IPC.mirror.stop, deviceId),
    openWindow: (deviceId: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC.mirror.openWindow, deviceId),
    onMetadata: (cb: (meta: MirrorMetadata) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, meta: MirrorMetadata): void => cb(meta)
      ipcRenderer.on(IPC.mirror.metadata, listener)
      return () => ipcRenderer.removeListener(IPC.mirror.metadata, listener)
    },
    onFrame: (cb: (data: FramePacket) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, data: FramePacket): void => cb(data)
      ipcRenderer.on(IPC.mirror.frame, listener)
      return () => ipcRenderer.removeListener(IPC.mirror.frame, listener)
    },
    onError: (cb: (msg: string) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, msg: string): void => cb(msg)
      ipcRenderer.on(IPC.mirror.error, listener)
      return () => ipcRenderer.removeListener(IPC.mirror.error, listener)
    },
    onWindowClosed: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on(IPC.mirror.windowClosed, listener)
      return () => ipcRenderer.removeListener(IPC.mirror.windowClosed, listener)
    },
  },
  files: {
    list: (deviceId: string, path: string): Promise<FileListResult> =>
      ipcRenderer.invoke(IPC.files.list, deviceId, path),
    download: (deviceId: string, remotePath: string): Promise<FileDownloadResult> =>
      ipcRenderer.invoke(IPC.files.download, deviceId, remotePath),
    upload: (deviceId: string, remotePath: string): Promise<FileUploadResult> =>
      ipcRenderer.invoke(IPC.files.upload, deviceId, remotePath),
    delete: (deviceId: string, remotePath: string): Promise<FileDeleteResult> =>
      ipcRenderer.invoke(IPC.files.delete, deviceId, remotePath),
    mkdir: (deviceId: string, remotePath: string): Promise<FileMkdirResult> =>
      ipcRenderer.invoke(IPC.files.mkdir, deviceId, remotePath),
  },
  record: {
    start: (deviceId: string): Promise<RecordStartResult> =>
      ipcRenderer.invoke(IPC.record.start, deviceId),
    stop: (deviceId: string): Promise<RecordStopResult> =>
      ipcRenderer.invoke(IPC.record.stop, deviceId),
  },
  toolkit: {
    status: (): Promise<ToolkitStatusResult> => ipcRenderer.invoke(IPC.toolkit.status),
  },
  log: {
    getPath: (): Promise<string> => ipcRenderer.invoke(IPC.log.getPath),
    read: (): Promise<string> => ipcRenderer.invoke(IPC.log.read),
  },
  dialog: {
    openFolder: (): Promise<string | null> => ipcRenderer.invoke(IPC.dialog.openFolder),
    openFile: (): Promise<string | null> => ipcRenderer.invoke(IPC.dialog.openFile),
  },
  settings: {
    getExportDir: (): Promise<string | null> => ipcRenderer.invoke(IPC.settings.getExportDir),
    setExportDir: (dir: string): Promise<void> => ipcRenderer.invoke(IPC.settings.setExportDir, dir),
    getOcrBaseUrl: (): Promise<string> => ipcRenderer.invoke(IPC.settings.getOcrBaseUrl),
    setOcrBaseUrl: (url: string): Promise<void> => ipcRenderer.invoke(IPC.settings.setOcrBaseUrl, url),
  },
  updater: {
    check: (): void => ipcRenderer.send(IPC.updater.check),
    download: (): void => ipcRenderer.send(IPC.updater.download),
    install: (): void => ipcRenderer.send(IPC.updater.install),
    onChecking: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on(IPC.updater.checking, listener)
      return () => ipcRenderer.removeListener(IPC.updater.checking, listener)
    },
    onAvailable: (cb: (info: { version: string; releaseNotes?: string }) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, info: { version: string; releaseNotes?: string }): void => cb(info)
      ipcRenderer.on(IPC.updater.available, listener)
      return () => ipcRenderer.removeListener(IPC.updater.available, listener)
    },
    onNotAvailable: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on(IPC.updater.notAvailable, listener)
      return () => ipcRenderer.removeListener(IPC.updater.notAvailable, listener)
    },
    onProgress: (cb: (info: { percent: number }) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, info: { percent: number }): void => cb(info)
      ipcRenderer.on(IPC.updater.progress, listener)
      return () => ipcRenderer.removeListener(IPC.updater.progress, listener)
    },
    onDownloaded: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on(IPC.updater.downloaded, listener)
      return () => ipcRenderer.removeListener(IPC.updater.downloaded, listener)
    },
    onError: (cb: (info: { message: string }) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, info: { message: string }): void => cb(info)
      ipcRenderer.on(IPC.updater.error, listener)
      return () => ipcRenderer.removeListener(IPC.updater.error, listener)
    },
  },
  workflow: {
    run: (payload: import('../shared/workflow').WorkflowRunPayload): Promise<import('../shared/workflow').WorkflowRunResult> =>
      ipcRenderer.invoke(IPC.workflow.run, payload),
    stop: (): void => ipcRenderer.send(IPC.workflow.stop),
    onLog: (cb: (log: import('../shared/workflow').ExecutionLog) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, log: import('../shared/workflow').ExecutionLog): void => cb(log)
      ipcRenderer.on(IPC.workflow.log, listener)
      return () => ipcRenderer.removeListener(IPC.workflow.log, listener)
    },
    onDone: (cb: (result: { status: 'done' | 'error' | 'stopped'; error?: string }) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, result: { status: 'done' | 'error' | 'stopped'; error?: string }): void => cb(result)
      ipcRenderer.on(IPC.workflow.done, listener)
      return () => ipcRenderer.removeListener(IPC.workflow.done, listener)
    },
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
