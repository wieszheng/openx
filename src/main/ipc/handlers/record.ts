import type { IpcMainInvokeEvent } from 'electron'
import { parseDeviceRef, logErr } from '../../devices/device-ref'
// import { startAndroidRecord, stopAndroidRecord } from '../../devices/android/record'
import { startHarmonyRecord, stopHarmonyRecord } from '../../devices/harmony/record'
import { createLogger } from '../../log'
import type { RecordStartResult, RecordStopResult } from '../../../shared/record'

const logger = createLogger('ipc:record')

export async function handleRecordStart(
  _event: IpcMainInvokeEvent,
  deviceId: string,
): Promise<RecordStartResult> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) return { ok: false, error: '无效的设备 ID' }

  try {
    if (ref.platform === 'android') {
      // await startAndroidRecord(ref.key)
    } else {
      await startHarmonyRecord(ref.key)
    }
    return { ok: true }
  } catch (e) {
    logger.warn('record start failed', logErr(e).errMessage)
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleRecordStop(
  _event: IpcMainInvokeEvent,
  deviceId: string,
): Promise<RecordStopResult> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) return { ok: false, error: '无效的设备 ID' }

  try {
    const result = ref.platform === 'android'
      ?  await stopHarmonyRecord(ref.key)
      : await stopHarmonyRecord(ref.key)
    return { ok: true, ...result }
  } catch (e) {
    logger.warn('record stop failed', logErr(e).errMessage)
    return { ok: false, error: logErr(e).errMessage }
  }
}
