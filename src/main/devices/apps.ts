import type { DeviceApp, ListAppsOptions } from '../../shared/device-app'
import { listAndroidApps } from './android/apps'
import { parseDeviceRef } from './device-ref'
import { listHarmonyApps } from './harmony/apps'

export async function listDeviceApps(
  deviceId: string,
  options?: ListAppsOptions
): Promise<DeviceApp[]> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    throw new Error(`Invalid device id: ${deviceId}`)
  }

  const includeSystem = options?.includeSystem ?? false

  if (ref.platform === 'android') {
    return listAndroidApps(ref.key, includeSystem)
  }
  return listHarmonyApps(ref.key, includeSystem)
}
