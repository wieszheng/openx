import type { DeviceApp } from '../../../shared/device-app'
import { createLogger } from '../../log'
import { shell } from './base'
import { isSystemBundle, parseBundleDump, resolveMainAbility } from './bundle'
import { mapConcurrent } from '../../utils'

const logger = createLogger('hdcApps')
const INFO_CHUNK = 25
const ONLINE_CONCURRENCY = 6

const INFO_URL = 'https://web-drcn.hispace.dbankcloud.com/edge/webedge/appinfo'

interface OnlineBundleInfo {
  name?: string
  icon?: string
}

const cache = new Map<string, OnlineBundleInfo>()

/** 华为应用市场元数据 */
export async function getOnlineBundleInfo(bundleName: string): Promise<OnlineBundleInfo> {
  if (cache.has(bundleName)) {
    return cache.get(bundleName)!
  }

  logger.debug('fetch online bundle info', bundleName)

  const res = await fetch(INFO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pkgName: bundleName,
      appId: bundleName,
      locale: 'zh_CN',
      countryCode: 'CN',
      orderApp: 1
    })
  })

  if (!res.ok) {
    return {}
  }

  let data: OnlineBundleInfo = {}
  try {
    data = await res.json()
  } catch {
    return {}
  }

  cache.set(bundleName, data)
  return data
}

export function shouldFetchOnlineInfo(bundleName: string, isSystem: boolean): boolean {
  return !isSystem && !bundleName.startsWith('com.huawei')
}

/** 列出鸿蒙已安装应用 */
export async function listHarmonyApps(
  connectKey: string,
  includeSystem = true
): Promise<DeviceApp[]> {
  logger.debug('listApps', { connectKey, includeSystem })

  const output = await shell(connectKey, 'bm dump -a')
  const bundleNames = output
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((name) => includeSystem || !isSystemBundle(name))

  if (bundleNames.length === 0) {
    return []
  }

  const apps: DeviceApp[] = []

  for (let i = 0; i < bundleNames.length; i += INFO_CHUNK) {
    const chunk = bundleNames.slice(i, i + INFO_CHUNK)
    const dumps = await shell(
      connectKey,
      chunk.map((name) => `bm dump -n ${name}`)
    )

    chunk.forEach((bundleName, index) => {
      const info = parseBundleDump(dumps[index] ?? '')
      const appInfo = info?.applicationInfo
      const isSystem = appInfo?.isSystemApp ?? isSystemBundle(bundleName)
      apps.push({
        packageName: bundleName,
        name: bundleName,
        version: appInfo?.versionName?.trim() ?? '',
        isSystem,
        mainAbility: resolveMainAbility(info)
      })
    })
  }

  const onlineTargets = apps.filter((app) => shouldFetchOnlineInfo(app.packageName, app.isSystem))
  await mapConcurrent(onlineTargets, ONLINE_CONCURRENCY, async (app) => {
    try {
      const online = await getOnlineBundleInfo(app.packageName)
      if (online.name) {
        app.name = online.name
      }
      if (online.icon) {
        app.icon = online.icon
      }
    } catch (e) {
      logger.debug('online info failed', app.packageName, e)
    }
  })

  const filtered = includeSystem ? apps : apps.filter((a) => !a.isSystem)
  return filtered.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
}
