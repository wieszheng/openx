import type { Device } from '@devicefarmer/adbkit'
import type { UnifiedDevice, UnifiedDeviceState } from '../types'
import { getAdbClient } from './client'

/** ADB 设备类型映射为统一状态 */
function mapAdbType(type: Device['type']): UnifiedDeviceState {
  switch (type) {
    case 'device':
    case 'emulator':
      return 'online'
    case 'offline':
      return 'offline'
    case 'unauthorized':
      return 'unauthorized'
    default:
      return 'unknown'
  }
}

/** 获取 Android 设备显示名称 */
function getAndroidDisplayName(properties: Record<string, string>): string {
  const marketKeys = [
    'ro.oppo.market.name',
    'ro.config.marketing_name',
    'ro.vendor.oplus.market.enname',
    'ro.vivo.market.name',
    'ro.product.marketname',
    'ro.asus.product.mkt_name'
  ]
  for (const key of marketKeys) {
    const v = properties[key]
    if (v?.trim()) {
      return v.trim()
    }
  }
  const manufacturer = (properties['ro.product.manufacturer'] ?? '').trim()
  const model = (properties['ro.product.model'] ?? '').trim()
  const combined = `${manufacturer} ${model}`.trim()
  if (combined) {
    return combined
  }
  return (properties['ro.product.name'] ?? '').trim() || 'Android 设备'
}

/** 构建 Android 设备标签 */
function buildAndroidLabel(
  displayName: string,
  serial: string,
  androidVersion?: string,
  sdkVersion?: string
): string {
  const ver =
    androidVersion && sdkVersion
      ? `Android ${androidVersion} · API ${sdkVersion}`
      : androidVersion
        ? `Android ${androidVersion}`
        : sdkVersion
          ? `API ${sdkVersion}`
          : ''
  const tail = ver ? ` · ${ver}` : ''
  return `${displayName} (${serial})${tail}`
}

/** 基础映射（不含设备详情） */
export function mapAdbDeviceFallback(device: Device): UnifiedDevice {
  const typeLabel =
    device.type === 'emulator' ? '模拟器' : device.type === 'device' ? '设备' : device.type
  const serial = device.id
  return {
    id: `android:${serial}`,
    platform: 'android',
    state: mapAdbType(device.type),
    displayName: serial,
    connectionKey: serial,
    label: `${serial} · ${typeLabel}`
  }
}

/** 补充设备详情 */
async function enrichDevice(device: Device): Promise<UnifiedDevice> {
  const base = mapAdbDeviceFallback(device)
  if (device.type !== 'device' && device.type !== 'emulator') {
    return base
  }
  try {
    const props = await getAdbClient().getDevice(device.id).getProperties()
    const displayName = getAndroidDisplayName(props)
    const androidVersion = props['ro.build.version.release']?.trim() || undefined
    const sdkVersion = props['ro.build.version.sdk']?.trim() || undefined
    return {
      ...base,
      displayName,
      androidVersion,
      sdkVersion,
      label: buildAndroidLabel(displayName, device.id, androidVersion, sdkVersion)
    }
  } catch {
    return base
  }
}

/** 获取所有 Android 设备 */
export async function listAndroidDevices(): Promise<UnifiedDevice[]> {
  const list = await getAdbClient().listDevices()
  return Promise.all(list.map((d) => enrichDevice(d)))
}
