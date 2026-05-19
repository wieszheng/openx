import type { IpcMainInvokeEvent } from 'electron'
import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron'
import type {
  AppActionResult,
  AppsListResult,
  ListAppsOptions,
  StartAppPayload
} from '../../../shared/device-app'

import {
  listDeviceApps,
  installDeviceApp,
  startDeviceApp,
  stopDeviceApp,
  uninstallDeviceApp,
  clearDeviceApp,
  clearDeviceAppCache,
  disableDeviceApp,
  enableDeviceApp
} from '../../devices'

import { logErr, parseDeviceRef } from '../../devices/device-ref'
import { createLogger } from '../../log'

const logger = createLogger('ipc:apps')

export async function handleAppsList(
  _event: IpcMainInvokeEvent,
  deviceId: string,
  options?: ListAppsOptions
): Promise<AppsListResult> {
  try {
    const apps = await listDeviceApps(deviceId, options)
    return { ok: true, apps }
  } catch (e) {
    logger.warn('apps:list failed', { deviceId, error: logErr(e).errMessage })
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleAppsStart(
  _event: IpcMainInvokeEvent,
  deviceId: string,
  payload: StartAppPayload
): Promise<AppActionResult> {
  try {
    await startDeviceApp(deviceId, payload)
    return { ok: true }
  } catch (e) {
    logger.warn('apps:start failed', { deviceId, payload, error: logErr(e).errMessage })
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleAppsStop(
  _event: IpcMainInvokeEvent,
  deviceId: string,
  packageName: string
): Promise<AppActionResult> {
  try {
    await stopDeviceApp(deviceId, packageName)
    return { ok: true }
  } catch (e) {
    logger.warn('apps:stop failed', { deviceId, packageName, error: logErr(e).errMessage })
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleAppsUninstall(
  _event: IpcMainInvokeEvent,
  deviceId: string,
  packageName: string
): Promise<AppActionResult> {
  try {
    await uninstallDeviceApp(deviceId, packageName)
    return { ok: true }
  } catch (e) {
    logger.warn('apps:uninstall failed', { deviceId, packageName, error: logErr(e).errMessage })
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleAppsInstall(
  event: IpcMainInvokeEvent,
  deviceId: string
): Promise<AppActionResult> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    return { ok: false, error: `无效的设备 ID: ${deviceId}` }
  }

  const parentWindow = BrowserWindow.fromWebContents(event.sender)
  const filters =
    ref.platform === 'harmony'
      ? [{ name: '鸿蒙应用包', extensions: ['hap'] }]
      : [{ name: 'Android 应用包', extensions: ['apk'] }]

  const dialogOptions: OpenDialogOptions = {
    title: ref.platform === 'harmony' ? '选择要安装的鸿蒙应用包' : '选择要安装的 APK',
    properties: ['openFile'],
    filters
  }
  logger.debug(dialogOptions)
  const picked = parentWindow
    ? await dialog.showOpenDialog(parentWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)

  if (picked.canceled || picked.filePaths.length === 0) {
    return { ok: false, error: '', cancelled: true }
  }

  const packagePath = picked.filePaths[0]

  try {
    await installDeviceApp(deviceId, packagePath)
    return { ok: true }
  } catch (e) {
    logger.warn('apps:install failed', { deviceId, packagePath, error: logErr(e).errMessage })
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleAppsClearData(
  _event: IpcMainInvokeEvent,
  deviceId: string,
  packageName: string
): Promise<AppActionResult> {
  try {
    await clearDeviceApp(deviceId, packageName)
    return { ok: true }
  } catch (e) {
    logger.warn('apps:clearData failed', { deviceId, packageName, error: logErr(e).errMessage })
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleAppsClearCache(
  _event: IpcMainInvokeEvent,
  deviceId: string,
  packageName: string
): Promise<AppActionResult> {
  try {
    await clearDeviceAppCache(deviceId, packageName)
    return { ok: true }
  } catch (e) {
    logger.warn('apps:clearCache failed', { deviceId, packageName, error: logErr(e).errMessage })
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleAppsDisable(
  _event: IpcMainInvokeEvent,
  deviceId: string,
  packageName: string
): Promise<AppActionResult> {
  try {
    await disableDeviceApp(deviceId, packageName)
    return { ok: true }
  } catch (e) {
    logger.warn('apps:disable failed', { deviceId, packageName, error: logErr(e).errMessage })
    return { ok: false, error: logErr(e).errMessage }
  }
}

export async function handleAppsEnable(
  _event: IpcMainInvokeEvent,
  deviceId: string,
  packageName: string
): Promise<AppActionResult> {
  try {
    await enableDeviceApp(deviceId, packageName)
    return { ok: true }
  } catch (e) {
    logger.warn('apps:enable failed', { deviceId, packageName, error: logErr(e).errMessage })
    return { ok: false, error: logErr(e).errMessage }
  }
}