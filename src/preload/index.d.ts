import type { ElectronAPI } from '@electron-toolkit/preload'
import type { UnifiedDevice } from '../shared/unified-device'

interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
}

interface DevicesAPI {
  list: () => Promise<UnifiedDevice[]>
  onListChanged: (cb: (devices: UnifiedDevice[]) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      window: WindowAPI
      devices: DevicesAPI
    }
  }
}

export {}
