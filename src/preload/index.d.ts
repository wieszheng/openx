import type { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AppActionResult,
  AppsListResult,
  ListAppsOptions,
  ScreencapResult,
  StartAppPayload,
} from '../shared/device-app'
import type { UnifiedDevice } from '../shared/unified-device'
import type { MirrorActionResult, MirrorMetadata, MirrorOptions, FramePacket } from '../shared/mirror'

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
  clearData: (deviceId: string, packageName: string) => Promise<AppActionResult>
  clearCache: (deviceId: string, packageName: string) => Promise<AppActionResult>
  disable: (deviceId: string, packageName: string) => Promise<AppActionResult>
  enable: (deviceId: string, packageName: string) => Promise<AppActionResult>
}

interface ScreencapAPI {
  capture: (deviceId: string) => Promise<ScreencapResult>
}

interface MirrorAPI {
  start: (deviceId: string, options?: MirrorOptions) => Promise<MirrorActionResult>
  stop: (deviceId: string) => Promise<void>
  openWindow: (deviceId: string) => Promise<{ ok: boolean; error?: string }>
  onMetadata: (cb: (meta: MirrorMetadata) => void) => () => void
  onFrame: (cb: (data: FramePacket) => void) => () => void
  onError: (cb: (msg: string) => void) => () => void
  onWindowClosed: (cb: () => void) => () => void
}

interface ToolkitAPI {
  status: () => Promise<ToolkitStatusResult>
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
      mirror: MirrorAPI
      toolkit: ToolkitAPI
      log: LogAPI
    }
  }
}

export {}
