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
      ipcRenderer.invoke(IPC.apps.install, deviceId)
  },
  screencap: {
    capture: (deviceId: string): Promise<ScreencapResult> =>
      ipcRenderer.invoke(IPC.screencap.capture, deviceId)
  },

  log: {
    getPath: (): Promise<string> => ipcRenderer.invoke(IPC.log.getPath)
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
