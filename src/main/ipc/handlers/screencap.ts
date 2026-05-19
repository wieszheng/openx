import type { IpcMainInvokeEvent } from 'electron'
import type { ScreencapResult } from '../../../shared/device-app'
import { logErr } from '../../devices/device-ref'
import { captureDeviceScreenshot } from '../../devices/screencap'
import { createLogger } from '../../log'

const logger = createLogger('ipc:screencap')

export async function handleScreencap(
  _event: IpcMainInvokeEvent,
  deviceId: string,
): Promise<ScreencapResult> {
  try {
    const { data, mimeType } = await captureDeviceScreenshot(deviceId)
    return { ok: true, data, mimeType }
  } catch (e) {
    logger.warn('screencap failed', { deviceId, error: logErr(e).errMessage })
    return { ok: false, error: logErr(e).errMessage }
  }
}
