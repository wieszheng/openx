// Android 设备驱动
export * from './android'

// Harmony 设备驱动
export * from './harmony'

// 公共模块
export { getDevicesSnapshot, startDeviceDiscovery, stopDeviceDiscovery } from './orchestrator'
export { listDeviceApps } from './apps'

export type {
  UnifiedDevice,
  UnifiedDevicePlatform,
  UnifiedDeviceState
} from '../../shared/unified-device'

export { installDeviceApp, startDeviceApp, stopDeviceApp, uninstallDeviceApp, clearDeviceApp, clearDeviceAppCache, disableDeviceApp, enableDeviceApp} from './app-control'
export { dumpDeviceLayout } from './layout'