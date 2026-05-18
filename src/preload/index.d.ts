import { ElectronAPI } from '@electron-toolkit/preload'

interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      window: WindowAPI
    }
  }
}
