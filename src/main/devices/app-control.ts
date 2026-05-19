import { parseDeviceRef } from './device-ref'
import {
  installAndroidApp,
  startAndroidApp,
  stopAndroidApp,
  uninstallAndroidApp,
  clearAndroidApp,
  disableAndroidApp,
  enableAndroidApp,
} from './android/app-control'
import {
  installHarmonyApp,
  startHarmonyApp,
  stopHarmonyApp,
  uninstallHarmonyApp,
  clearHarmonyAppData,
  clearHarmonyAppCache,
} from './harmony/app-control'

export interface StartDeviceAppOptions {
  packageName: string
  mainAbility?: string
}

export async function startDeviceApp(
  deviceId: string,
  options: StartDeviceAppOptions,
): Promise<void> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    throw new Error(`Invalid device id: ${deviceId}`)
  }

  if (ref.platform === 'android') {
    await startAndroidApp(ref.key, options.packageName)
    return
  }

  if (!options.mainAbility) {
    throw new Error('鸿蒙应用缺少 mainAbility，无法启动')
  }
  await startHarmonyApp(ref.key, options.packageName, options.mainAbility)
}

export async function stopDeviceApp(deviceId: string, packageName: string): Promise<void> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    throw new Error(`Invalid device id: ${deviceId}`)
  }

  if (ref.platform === 'android') {
    await stopAndroidApp(ref.key, packageName)
    return
  }
  await stopHarmonyApp(ref.key, packageName)
}

export async function uninstallDeviceApp(deviceId: string, packageName: string): Promise<void> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    throw new Error(`Invalid device id: ${deviceId}`)
  }

  if (ref.platform === 'android') {
    await uninstallAndroidApp(ref.key, packageName)
    return
  }
  await uninstallHarmonyApp(ref.key, packageName)
}

export async function installDeviceApp(deviceId: string, packagePath: string): Promise<void> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    throw new Error(`Invalid device id: ${deviceId}`)
  }

  if (ref.platform === 'android') {
    await installAndroidApp(ref.key, packagePath)
    return
  }
  await installHarmonyApp(ref.key, packagePath)
}

export async function clearDeviceApp(deviceId: string, packageName: string): Promise<void> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    throw new Error(`Invalid device id: ${deviceId}`)
  }

  if (ref.platform === 'android') {
    await clearAndroidApp(ref.key, packageName)
    return
  }
  await clearHarmonyAppData(ref.key, packageName)
}

export async function clearDeviceAppCache(deviceId: string, packageName: string): Promise<void> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    throw new Error(`Invalid device id: ${deviceId}`)
  }

  if (ref.platform === 'android') {
    throw new Error('Android 不支持单独清除缓存，请使用 clearDeviceApp 清除数据')
  }
  await clearHarmonyAppCache(ref.key, packageName)
}

export async function disableDeviceApp(deviceId: string, packageName: string): Promise<void> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    throw new Error(`Invalid device id: ${deviceId}`)
  }

  if (ref.platform === 'android') {
    await disableAndroidApp(ref.key, packageName)
    return
  }
  throw new Error('鸿蒙暂不支持禁用应用')
}

export async function enableDeviceApp(deviceId: string, packageName: string): Promise<void> {
  const ref = parseDeviceRef(deviceId)
  if (!ref) {
    throw new Error(`Invalid device id: ${deviceId}`)
  }

  if (ref.platform === 'android') {
    await enableAndroidApp(ref.key, packageName)
    return
  }
  throw new Error('鸿蒙暂不支持启用应用')
}

