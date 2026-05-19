import type { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AppActionResult,
  AppsListResult,
  ListAppsOptions,
  ScreencapResult,
  StartAppPayload,
} from '../shared/device-app'
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

interface AppsAPI {
  list: (deviceId: string, options?: ListAppsOptions) => Promise<AppsListResult>
  start: (deviceId: string, payload: StartAppPayload) => Promise<AppActionResult>
  stop: (deviceId: string, packageName: string) => Promise<AppActionResult>
  uninstall: (deviceId: string, packageName: string) => Promise<AppActionResult>
  install: (deviceId: string) => Promise<AppActionResult>
}

interface ScreencapAPI {
  capture: (deviceId: string) => Promise<ScreencapResult>
}

interface LogAPI {
  getPath: () => Promise<string>
}
declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      window: WindowAPI
      devices: DevicesAPI
      apps: AppsAPI
      screencap: ScreencapAPI
      log: LogAPI
    }
  }
}

export {}
