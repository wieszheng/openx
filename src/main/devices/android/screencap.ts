import { Adb } from '@devicefarmer/adbkit'
import { createLogger } from '../../log'
import { getAdbClient } from './client'

const logger = createLogger('adbScreencap')

/** 截取 Android 设备屏幕，返回 PNG base64 */
export async function captureAndroidScreenshot(serial: string): Promise<string> {
  logger.debug('screencap', serial)
  const device = getAdbClient().getDevice(serial)
  const stream = await device.screencap()
  const buf = await Adb.util.readAll(stream)
  return buf.toString('base64')
}
