import { parseDeviceRef } from './device-ref'
import { dumpLayout as dumpAndroidLayout } from './android/actions'
import { dumpLayout as dumpHarmonyLayout } from './harmony/actions'

/**
 * 抓取连接设备的 UI 布局信息（Android XML / Harmony JSON）
 */
export async function dumpDeviceLayout(deviceId: string): Promise<string> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    throw new Error(`Invalid device id: ${deviceId}`)
  }

  if (ref.platform === 'android') {
    return dumpAndroidLayout(ref.key)
  }

  if (ref.platform === 'ios') {
    throw new Error('iOS layout dump not supported yet')
  }

  // 默认平台为 harmony
  return dumpHarmonyLayout(ref.key)
}
