export function isSystemBundle(bundle: string): boolean {
  const prefixes = ['com.huawei.hmos', 'com.huawei.hms', 'com.huawei.msdp', 'com.ohos']
  if (prefixes.some((p) => bundle.startsWith(p))) {
    return true
  }
  return [
    'ohos.global.systemres',
    'com.huawei.associateassistant',
    'com.huawei.batterycare',
    'com.huawei.shell_assistant',
    'com.usb.right'
  ].includes(bundle)
}

export interface HarmonyBundleDump {
  mainEntry?: string
  hapModuleNames?: string[]
  hapModuleInfos?: Array<{
    mainAbility?: string
    abilityInfos?: Array<{ name: string }>
  }>
  applicationInfo?: {
    isSystemApp?: boolean
    versionName?: string
    apiTargetVersion?: number
    vendor?: string
  }
  installTime?: number
  releaseType?: string
}

export function parseBundleDump(raw: string): HarmonyBundleDump | null {
  const lines = raw.trim().split('\n')
  if (lines.length < 2) {
    return null
  }
  try {
    return JSON.parse(lines.slice(1).join('\n')) as HarmonyBundleDump
  } catch {
    return null
  }
}

export function resolveMainAbility(info: HarmonyBundleDump | null): string | undefined {
  if (!info?.mainEntry || !info.hapModuleNames || !info.hapModuleInfos) {
    return undefined
  }
  const index = info.hapModuleNames.indexOf(info.mainEntry)
  if (index < 0) {
    return undefined
  }
  const moduleInfo = info.hapModuleInfos[index]
  return moduleInfo?.mainAbility || moduleInfo?.abilityInfos?.[0]?.name
}
