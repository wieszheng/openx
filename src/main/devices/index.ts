// Android 设备驱动
export * from './android'

// Harmony 设备驱动
export * from './harmony'

// 公共模块
export {
  getDevicesSnapshot,
  startDeviceDiscovery,
  stopDeviceDiscovery,
  CHANGED_CHANNEL
} from './orchestrator'
export { registerDeviceIpc, initDeviceDiscovery, disposeDeviceDiscovery } from './ipc'
export type { UnifiedDevice, UnifiedDevicePlatform, UnifiedDeviceState } from './types'
