export type UnifiedDevicePlatform = 'android' | 'harmony' | 'ios'

export type UnifiedDeviceState = 'online' | 'offline' | 'unauthorized' | 'unknown'

export interface UnifiedDevice {
  id: string
  platform: UnifiedDevicePlatform
  state: UnifiedDeviceState
  /** 列表与标题栏主文案（含名称与版本摘要） */
  label: string
  /** 设备展示名称（厂商/市场名或鸿蒙产品名） */
  displayName: string
  /** 连接标识：安卓为 serial；鸿蒙为 hdc connectKey */
  connectionKey: string
  /** Android：`ro.build.version.release` */
  androidVersion?: string
  /** 鸿蒙：自 `const.product.software.version` 解析的版本号 */
  ohosVersion?: string
  /** Android：`ro.build.version.sdk`；鸿蒙：`const.ohos.apiversion` */
  sdkVersion?: string
}
