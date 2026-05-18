import type { UnifiedDevice } from '../../../shared/unified-device'
import { getHdcClient } from './client'

/** 从软件版本字符串解析 OpenHarmony 版本号 */
function parseOhosVersion(softwareVersion: string): string {
  const s = softwareVersion.trim()
  if (!s) {
    return ''
  }
  const parts = s.split(/\s+/)
  if (parts.length < 2) {
    return s
  }
  let ver = parts[1]
  const idx = ver.indexOf('(')
  if (idx !== -1) {
    ver = ver.slice(0, idx)
  }
  return ver.trim()
}

/** 构建 Harmony 设备标签 */
function buildHarmonyLabel(
  displayName: string,
  connectKey: string,
  ohosVersion?: string,
  sdkVersion?: string
): string {
  const ver =
    ohosVersion && sdkVersion
      ? `OpenHarmony ${ohosVersion} · API ${sdkVersion}`
      : ohosVersion
        ? `OpenHarmony ${ohosVersion}`
        : sdkVersion
          ? `API ${sdkVersion}`
          : ''
  const tail = ver ? ` · ${ver}` : ''
  return `${displayName} (${connectKey})${tail}`
}

/** 基础映射（不含设备详情） */
export function mapHarmonyTargetFallback(connectKey: string): UnifiedDevice {
  return {
    id: `harmony:${connectKey}`,
    platform: 'harmony',
    state: 'online',
    displayName: connectKey,
    connectionKey: connectKey,
    label: `${connectKey} · 鸿蒙`
  }
}

/** 补充设备详情 */
async function enrichTarget(connectKey: string): Promise<UnifiedDevice> {
  const base = mapHarmonyTargetFallback(connectKey)
  try {
    const parameters = await getHdcClient().getTarget(connectKey).getParameters()
    const displayName = (parameters['const.product.name'] ?? connectKey).trim() || connectKey
    const softwareVersion = parameters['const.product.software.version'] ?? ''
    const ohosVersion = parseOhosVersion(softwareVersion) || undefined
    const sdkRaw = parameters['const.ohos.apiversion']
    const sdkVersion =
      sdkRaw != null && String(sdkRaw).trim() !== '' ? String(sdkRaw).trim() : undefined
    return {
      ...base,
      displayName,
      ohosVersion,
      sdkVersion,
      label: buildHarmonyLabel(displayName, connectKey, ohosVersion, sdkVersion)
    }
  } catch {
    return base
  }
}

/** 获取所有 Harmony 设备 */
export async function listHarmonyDevices(): Promise<UnifiedDevice[]> {
  const targets = await getHdcClient().listTargets()
  return Promise.all(targets.map((key) => enrichTarget(key)))
}
