import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
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
