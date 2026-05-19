import { createLogger } from '../../log'
import { shell } from './base'
import { getHdcClient } from './client'

const logger = createLogger('hdcAppControl')

export async function startHarmonyApp(
  connectKey: string,
  bundleName: string,
  mainAbility: string,
): Promise<void> {
  logger.debug('start', { connectKey, bundleName, mainAbility })
  await shell(connectKey, `aa start -a ${mainAbility} -b ${bundleName}`)
}

export async function stopHarmonyApp(connectKey: string, bundleName: string): Promise<void> {
  logger.debug('stop', { connectKey, bundleName })
  await shell(connectKey, `aa force-stop ${bundleName}`)
}

export async function clearHarmonyAppData(connectKey: string, bundleName: string): Promise<void>  {
  logger.debug('clear Data', { connectKey, bundleName })
  await shell(connectKey, `bm clean -n ${bundleName} -d`)
}

export async function clearHarmonyAppCache(connectKey: string, bundleName: string): Promise<void>  {
  logger.debug('clear Cache', { connectKey, bundleName })
  await shell(connectKey, `bm clean -n ${bundleName} -c`)
}

export async function uninstallHarmonyApp(connectKey: string, bundleName: string): Promise<void> {
  logger.debug('uninstall', { connectKey, bundleName })
  await getHdcClient().getTarget(connectKey).uninstall(bundleName)
}

/** 安装 HAP 等鸿蒙应用包 */
export async function installHarmonyApp(connectKey: string, packagePath: string): Promise<void> {
  logger.debug('install', { connectKey, packagePath })
  await getHdcClient().getTarget(connectKey).install(packagePath)
}


