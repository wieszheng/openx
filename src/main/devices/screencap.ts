import { captureAndroidScreenshot } from './android/screencap'
import { parseDeviceRef } from './device-ref'
import { captureHarmonyScreenshot } from './harmony/screencap'
import { captureIosScreenshot } from './ios/screencap'

export async function captureDeviceScreenshot(
  deviceId: string,
): Promise<{ data: string; mimeType: 'image/png' | 'image/jpeg' }> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    throw new Error(`Invalid device id: ${deviceId}`)
  }

  if (ref.platform === 'android') {
    const data = await captureAndroidScreenshot(ref.key)
    return { data, mimeType: 'image/png' }
  }

  if (ref.platform === 'ios') {
    const data = await captureIosScreenshot(ref.key)
    return { data, mimeType: 'image/png' }
  }

  const data = await captureHarmonyScreenshot(ref.key)
  return { data, mimeType: 'image/jpeg' }
}
