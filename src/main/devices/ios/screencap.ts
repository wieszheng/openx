import { createLogger } from '../../log'
import { IOSDevice } from './base'

const logger = createLogger('iosScreencap')

export async function captureIosScreenshot(udid: string): Promise<string> {
  logger.debug('screencap', udid)
  const d = new IOSDevice()
  const buf = await d.screenshot()
  return buf.toString('base64')
}
