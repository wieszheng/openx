import type { DeviceApp } from '../../../shared/device-app'
import { shell } from './base'
import { createLogger } from '../../log'
import { mapConcurrent } from '../../utils'

const logger = createLogger('adbApps')
const VERSION_CHUNK = 40
const ONLINE_CONCURRENCY = 6

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export interface OnlineAndroidAppInfo {
  name?: string
  icon?: string
}

const cache = new Map<string, OnlineAndroidAppInfo>()

function miDetailsUrl(packageName: string): string {
  return `https://app.mi.com/details?id=${encodeURIComponent(packageName)}`
}

function wandoujiaAppUrl(packageName: string): string {
  return `https://www.wandoujia.com/apps/${encodeURIComponent(packageName)}`
}

/** 仅当存在应用详情图标块时认为命中小米详情页，避免泛型列表页标题误判 */
function parseXiaomiDetails(html: string): { name?: string; iconUrl?: string } {
  const flower = html.match(/class="yellow-flower"\s+src="([^"]+)"(?:\s+alt="([^"]*)")?/)
  const iconUrl = flower?.[1]?.trim()
  if (!iconUrl) {
    return {}
  }
  let name = flower?.[2]?.trim()

  const h3 = html.match(/<div class="intro-titles">[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/)
  if (h3?.[1]) {
    name = h3[1].trim()
  }

  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim()
  if (!name && title?.endsWith('-小米应用商店')) {
    const n = title.slice(0, -'-小米应用商店'.length).trim()
    if (n && !n.includes('软件商店') && n !== '手机游戏应用商店') {
      name = n
    }
  }

  return { name, iconUrl }
}

function parseWandoujiaDetails(html: string): { name?: string; iconUrl?: string } {
  const iconM = html.match(/(https:\/\/android-artworks\.25pp\.com[^"'>\s]+_con_130x130\.png)/)
  const titleRaw = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim()
  let name: string | undefined
  if (titleRaw) {
    const noSuffix = titleRaw.replace(/_豌豆荚.*$/, '')
    const beforeXiazai = noSuffix.match(/^(.+?)下载/)
    name = (beforeXiazai ? beforeXiazai[1] : (noSuffix.split('_')[0] ?? '')).trim()
    if (!name) {
      name = undefined
    }
  }
  return { name, iconUrl: iconM?.[1]?.trim() }
}

/** 与鸿蒙 `shouldFetchOnlineInfo` 一致：仅第三方应用走在线元数据 */
export function shouldFetchOnlineAndroidInfo(_packageName: string, isSystem: boolean): boolean {
  return !isSystem
}

/**
 * 小米应用商店详情页 + 豌豆荚应用页（与鸿蒙走华为应用市场类似）。
 * 无官方开放 API，依赖页面结构；失败时静默返回空字段。
 */
export async function getOnlineAndroidAppInfo(packageName: string): Promise<OnlineAndroidAppInfo> {
  if (cache.has(packageName)) {
    return cache.get(packageName)!
  }

  let name: string | undefined
  let iconUrl: string | undefined

  try {
    const miRes = await fetch(miDetailsUrl(packageName), {
      headers: { 'User-Agent': UA }
    })
    if (miRes.ok) {
      const miHtml = await miRes.text()
      const mi = parseXiaomiDetails(miHtml)
      name = mi.name
      iconUrl = mi.iconUrl
    }
  } catch (e) {
    logger.debug('xiaomi market fetch failed', packageName, e)
  }

  if (!iconUrl || !name) {
    try {
      const wRes = await fetch(wandoujiaAppUrl(packageName), {
        headers: { 'User-Agent': UA }
      })
      if (wRes.ok) {
        const wHtml = await wRes.text()
        const w = parseWandoujiaDetails(wHtml)
        if (!name && w.name) {
          name = w.name
        }
        if (!iconUrl && w.iconUrl) {
          iconUrl = w.iconUrl
        }
      }
    } catch (e) {
      logger.debug('wandoujia fetch failed', packageName, e)
    }
  }

  logger.debug('resolved icon url', packageName, iconUrl)
  const out: OnlineAndroidAppInfo = { name, icon: iconUrl }
  cache.set(packageName, out)
  return out
}

function parsePackageLine(line: string): { packageName: string; apkPath: string } | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('package:')) {
    return null
  }
  const body = trimmed.slice('package:'.length)
  const eq = body.lastIndexOf('=')
  if (eq === -1) {
    return null
  }
  return {
    apkPath: body.slice(0, eq),
    packageName: body.slice(eq + 1)
  }
}

function isSystemApkPath(apkPath: string): boolean {
  return (
    apkPath.startsWith('/system/') ||
    apkPath.startsWith('/product/') ||
    apkPath.startsWith('/vendor/') ||
    apkPath.startsWith('/apex/') ||
    apkPath.startsWith('/odm/')
  )
}

function fallbackName(packageName: string): string {
  const parts = packageName.split('.')
  return parts[parts.length - 1] || packageName
}

function parseDumpsysVersion(block: string): { version: string; versionCode?: number } {
  let version = ''
  let versionCode: number | undefined

  for (const line of block.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('versionName=')) {
      version = trimmed.slice('versionName='.length)
    } else if (trimmed.startsWith('versionCode=')) {
      const raw = trimmed.slice('versionCode='.length).split(/\s+/)[0]
      const n = Number.parseInt(raw, 10)
      if (Number.isFinite(n)) {
        versionCode = n
      }
    }
  }

  return { version, versionCode }
}

async function fetchVersionMap(
  serial: string,
  packages: string[]
): Promise<Map<string, { version: string; versionCode?: number }>> {
  const map = new Map<string, { version: string; versionCode?: number }>()
  if (packages.length === 0) {
    return map
  }

  for (let i = 0; i < packages.length; i += VERSION_CHUNK) {
    const chunk = packages.slice(i, i + VERSION_CHUNK)
    const cmds = chunk.map(
      (pkg) =>
        `echo "OPENX_PKG:${pkg}"; dumpsys package ${pkg} 2>/dev/null | grep -E 'versionName=|versionCode=' | head -2`
    )
    const blocks = await shell(serial, cmds)

    for (const block of blocks) {
      const lines = block.split('\n')
      let currentPkg = ''
      const verLines: string[] = []

      const flush = (): void => {
        if (currentPkg) {
          map.set(currentPkg, parseDumpsysVersion(verLines.join('\n')))
        }
        verLines.length = 0
      }

      for (const line of lines) {
        if (line.startsWith('OPENX_PKG:')) {
          flush()
          currentPkg = line.slice('OPENX_PKG:'.length).trim()
        } else if (line.trim()) {
          verLines.push(line)
        }
      }
      flush()
    }
  }

  return map
}

async function enrichUserAppsMetadata(apps: DeviceApp[]): Promise<void> {
  const targets = apps.filter((app) => shouldFetchOnlineAndroidInfo(app.packageName, app.isSystem))

  await mapConcurrent(targets, ONLINE_CONCURRENCY, async (app) => {
    try {
      const online = await getOnlineAndroidAppInfo(app.packageName)
      if (online.name) {
        app.name = online.name
      }
      if (online.icon) {
        app.icon = online.icon
      }
    } catch (e) {
      logger.debug('online android info failed', app.packageName, e)
    }
  })
}

/** 列出 Android 已安装应用 */
export async function listAndroidApps(serial: string, includeSystem = true): Promise<DeviceApp[]> {
  logger.debug('listApps', { serial, includeSystem })

  const flag = includeSystem ? ' -f' : ' -f -3'
  const output = await shell(serial, `pm list packages${flag}`)
  const parsed = output
    .split('\n')
    .map(parsePackageLine)
    .filter((item): item is { packageName: string; apkPath: string } => item !== null)

  const versionMap = await fetchVersionMap(
    serial,
    parsed.map((p) => p.packageName)
  )

  const apps = parsed.map(({ packageName, apkPath }) => {
    const ver = versionMap.get(packageName)
    return {
      packageName,
      name: fallbackName(packageName),
      version: ver?.version ?? '',
      versionCode: ver?.versionCode,
      isSystem: isSystemApkPath(apkPath)
    }
  })

  await enrichUserAppsMetadata(apps)

  const filtered = includeSystem ? apps : apps.filter((a) => !a.isSystem)
  return filtered.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
}
