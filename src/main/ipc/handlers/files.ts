import type { IpcMainInvokeEvent } from 'electron'
import { dialog, BrowserWindow } from 'electron'
import { basename } from 'node:path'
import { parseDeviceRef, logErr } from '../../devices/device-ref'
import {
  listAndroidFiles,
  downloadAndroidFile,
  uploadAndroidFile,
  deleteAndroidFile,
  mkdirAndroid,
} from '../../devices/android/files'
import {
  listHarmonyFiles,
  downloadHarmonyFile,
  uploadHarmonyFile,
  deleteHarmonyFile,
  mkdirHarmony,
} from '../../devices/harmony/files'
import { createLogger } from '../../log'
import type {
  FileListResult,
  FileDownloadResult,
  FileUploadResult,
  FileDeleteResult,
  FileMkdirResult,
} from '../../../shared/files'

const logger = createLogger('ipc:files')

export async function handleFilesList(
  _event: IpcMainInvokeEvent,
  deviceId: string,
  path: string,
): Promise<FileListResult> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) return { ok: false, error: '无效的设备 ID' }
  try {
    const entries = ref.platform === 'android'
      ? await listAndroidFiles(ref.key, path)
      : ref.platform === 'harmony'
        ? await listHarmonyFiles(ref.key, path)
        : (() => { throw new Error('iOS 暂不支持文件管理') })()
    return { ok: true, entries }
  } catch (e) {
    logger.warn('files list failed', logErr(e).errMessage)
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleFilesDownload(
  event: IpcMainInvokeEvent,
  deviceId: string,
  remotePath: string,
): Promise<FileDownloadResult> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) return { ok: false, error: '无效的设备 ID' }

  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePath } = await dialog.showSaveDialog(win!, {
    defaultPath: basename(remotePath),
    buttonLabel: '保存',
  })
  if (canceled || !filePath) return { ok: false, error: 'cancelled' }

  try {
    if (ref.platform === 'android') {
      await downloadAndroidFile(ref.key, remotePath, filePath)
    } else if (ref.platform === 'harmony') {
      await downloadHarmonyFile(ref.key, remotePath, filePath)
    } else {
      throw new Error('iOS 暂不支持文件管理')
    }
    return { ok: true, localPath: filePath }
  } catch (e) {
    logger.warn('files download failed', logErr(e).errMessage)
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleFilesUpload(
  event: IpcMainInvokeEvent,
  deviceId: string,
  remotePath: string,
): Promise<FileUploadResult> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) return { ok: false, error: '无效的设备 ID' }

  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
    buttonLabel: '上传',
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return { ok: false, error: 'cancelled' }
  const localPath = filePaths[0]

  try {
    const dest = `${remotePath.replace(/\/$/, '')}/${basename(localPath)}`
    if (ref.platform === 'android') {
      await uploadAndroidFile(ref.key, localPath, dest)
    } else if (ref.platform === 'harmony') {
      await uploadHarmonyFile(ref.key, localPath, dest)
    } else {
      throw new Error('iOS 暂不支持文件管理')
    }
    return { ok: true }
  } catch (e) {
    logger.warn('files upload failed', logErr(e).errMessage)
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleFilesDelete(
  _event: IpcMainInvokeEvent,
  deviceId: string,
  remotePath: string,
): Promise<FileDeleteResult> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) return { ok: false, error: '无效的设备 ID' }
  try {
    if (ref.platform === 'android') {
      await deleteAndroidFile(ref.key, remotePath)
    } else if (ref.platform === 'harmony') {
      await deleteHarmonyFile(ref.key, remotePath)
    } else {
      throw new Error('iOS 暂不支持文件管理')
    }
    return { ok: true }
  } catch (e) {
    logger.warn('files delete failed', logErr(e).errMessage)
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleFilesCreateDir(
  _event: IpcMainInvokeEvent,
  deviceId: string,
  remotePath: string,
): Promise<FileMkdirResult> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) return { ok: false, error: '无效的设备 ID' }
  try {
    if (ref.platform === 'android') {
      await mkdirAndroid(ref.key, remotePath)
    } else if (ref.platform === 'harmony') {
      await mkdirHarmony(ref.key, remotePath)
    } else {
      throw new Error('iOS 暂不支持文件管理')
    }
    return { ok: true }
  } catch (e) {
    logger.warn('files mkdir failed', logErr(e).errMessage)
    return { ok: false, error: logErr(e).errMessage }
  }
}
