import { createLogger } from '../../log'
import { shell } from './base'
import { getAdbClient } from './client'

const logger = createLogger('adbAppControl')

async function getMainComponent(serial: string, pkg: string): Promise<string> {
  const result = await shell(serial, `dumpsys package ${pkg} | grep -A 1 MAIN`)
  for (const line of result.split('\n')) {
    const trimmed = line.trim()
    const marker = `${pkg}/`
    if (trimmed.includes(marker)) {
      const start = trimmed.indexOf(marker)
      const end = trimmed.indexOf(' filter')
      return end > start ? trimmed.slice(start, end) : trimmed.slice(start)
    }
  }
  throw new Error(`无法获取 ${pkg} 的主 Activity`)
}

export async function startAndroidApp(serial: string, packageName: string): Promise<void> {
  logger.debug('start', { serial, packageName })
  const component = await getMainComponent(serial, packageName)
  await getAdbClient().getDevice(serial).startActivity({ component })
}

export async function stopAndroidApp(serial: string, packageName: string): Promise<void> {
  logger.debug('stop', { serial, packageName })
  await shell(serial, `am force-stop ${packageName}`)
}

export async function clearAndroidApp(serial: string, packageName: string): Promise<void>  {
  logger.debug('clear', { serial, packageName })
  await getAdbClient().getDevice(serial).clear(packageName)
}

export async function uninstallAndroidApp(serial: string, packageName: string): Promise<void> {
  logger.debug('uninstall', { serial, packageName })
  await getAdbClient().getDevice(serial).uninstall(packageName)
}

/** 安装 APK（覆盖已安装版本，等同 adb install -r） */
export async function installAndroidApp(serial: string, packagePath: string): Promise<void> {
  logger.debug('install', { serial, packagePath })
  await getAdbClient().getDevice(serial).install(packagePath)
}

export async function disableAndroidApp(serial: string, packageName: string): Promise<void> {
  logger.debug('disable', { serial, packageName })
  await shell(serial, `pm disable-user ${packageName}`)
}

export async function enableAndroidApp(serial: string, packageName: string): Promise<void> {
  logger.debug('enable', { serial, packageName })
  await shell(serial, `pm enable ${packageName}`)
}