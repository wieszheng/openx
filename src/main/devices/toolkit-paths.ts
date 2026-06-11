import { app } from 'electron'
import { join, normalize } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import { createLogger } from '../log'

const logger = createLogger('toolkit-paths')

/** 与 `electron-builder.yml` 中 `extraResources.to: toolkit` 一致 */
function toolkitRoot(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'toolkit')
  }
  // 开发：electron-vite 主进程入口多为 out/main，相对路径应为 ../../resources/toolkit
  const candidates = [
    join(app.getAppPath(), 'resources', 'toolkit'),
    join(__dirname, '../../resources/toolkit'),
    join(__dirname, '../../../resources/toolkit'),
  ]
  for (const c of candidates) {
    if (existsSync(c)) {
      logger.debug('toolkitRoot resolved', c)
      return normalize(c)
    }
  }
  const fallback = normalize(join(app.getAppPath(), 'resources', 'toolkit'))
  logger.warn('toolkitRoot not found in candidates, using fallback', fallback)
  return fallback
}

function platformSubdir(): string {
  if (process.platform === 'win32') {
    return 'win'
  }
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64'
  }
  return 'linux-x64'
}

function readOverride(envKey: string): string | null {
  const p = process.env[envKey]?.trim()
  if (p) {
    if (existsSync(p)) {
      return p
    }
    logger.warn(`env override ${envKey}="${p}" set but path does not exist`)
  }
  return null
}

/** 在 Android SDK / Homebrew 常见安装路径中查找 adb */
function findAdbInCommonPaths(): string | null {
  if (process.platform === 'win32') return null
  const home = process.env.HOME ?? ''
  const name = 'adb'
  const candidates = [
    join('/opt/homebrew/bin', name),                              // Homebrew (Apple Silicon)
    join('/usr/local/bin', name),                                 // Homebrew (Intel Mac)
    join(home, 'Library', 'Android', 'sdk', 'platform-tools', name), // Android Studio (macOS)
    join(home, 'Android', 'Sdk', 'platform-tools', name),        // Android Studio (Linux)
    join('/usr/bin', name),
  ]
  for (const c of candidates) {
    logger.debug('adb: checking common candidate', c, 'exists:', existsSync(c))
    if (existsSync(c)) return c
  }
  return null
}

/** 已随包放置的 adb 可执行文件绝对路径；不存在则返回 `null` */
export function getBundledAdbPath(): string | null {
  const override = readOverride('OPENX_ADB_PATH')
  if (override) {
    logger.info('adb: using env override', override)
    return override
  }
  const name = process.platform === 'win32' ? 'adb.exe' : 'adb'
  const candidate = join(toolkitRoot(), 'adb', platformSubdir(), name)
  logger.debug('adb: checking bundled path', candidate, 'exists:', existsSync(candidate))
  if (existsSync(candidate)) return candidate

  logger.debug('adb: bundled not found, searching common paths...')
  logger.debug('adb: HOME =', process.env.HOME ?? '(not set)')
  logger.debug('adb: PATH =', process.env.PATH ?? '(not set)')
  const found = findAdbInCommonPaths()
  if (found) {
    logger.info('adb: found in common paths', found)
  } else {
    logger.warn('adb: not found in bundled or common paths')
  }
  return found
}

/** adbkit `bin`：优先包内，其次 PATH 上的 `adb` */
export function resolveAdbExecutable(): string {
  const resolved = getBundledAdbPath() ?? 'adb'
  logger.info('adb: resolved executable', resolved)
  return resolved
}

/** 在 DevEco Studio / HarmonyOS 命令行工具常见安装路径中查找 hdc */
function findHdcInSdkPaths(): string | null {
  if (process.platform === 'win32') return null
  const home = process.env.HOME ?? ''
  const name = 'hdc'

  // Homebrew
  const brewCandidates = [
    join('/opt/homebrew/bin', name),
    join('/usr/local/bin', name),
  ]
  for (const c of brewCandidates) {
    logger.debug('hdc: checking brew candidate', c, 'exists:', existsSync(c))
    if (existsSync(c)) return c
  }

  // ~/Library/command-line-tools/sdk/<version>/openharmony/toolchains/hdc
  const cliToolsBase = join(home, 'Library', 'command-line-tools', 'sdk')
  logger.debug('hdc: checking command-line-tools base', cliToolsBase, 'exists:', existsSync(cliToolsBase))
  if (existsSync(cliToolsBase)) {
    let versions: string[]
    try { versions = readdirSync(cliToolsBase) } catch { versions = [] }
    logger.debug('hdc: command-line-tools versions', versions)
    // 'default' 优先，其次按字母倒序取最新版本
    versions.sort((a, b) => (a === 'default' ? -1 : b === 'default' ? 1 : b.localeCompare(a)))
    for (const v of versions) {
      const candidate = join(cliToolsBase, v, 'openharmony', 'toolchains', name)
      logger.debug('hdc: checking cli-tools candidate', candidate, 'exists:', existsSync(candidate))
      if (existsSync(candidate)) return candidate
    }
  }

  // ~/Library/Huawei/Sdk/openharmony/<version>/toolchains/hdc
  const huaweiSdkBase = join(home, 'Library', 'Huawei', 'Sdk', 'openharmony')
  logger.debug('hdc: checking Huawei SDK base', huaweiSdkBase, 'exists:', existsSync(huaweiSdkBase))
  if (existsSync(huaweiSdkBase)) {
    let versions: string[]
    try { versions = readdirSync(huaweiSdkBase) } catch { versions = [] }
    logger.debug('hdc: Huawei SDK versions', versions)
    versions.sort((a, b) => b.localeCompare(a))
    for (const v of versions) {
      const candidate = join(huaweiSdkBase, v, 'toolchains', name)
      logger.debug('hdc: checking Huawei SDK candidate', candidate, 'exists:', existsSync(candidate))
      if (existsSync(candidate)) return candidate
    }
  }

  return null
}

/** 已随包放置的 hdc 可执行文件绝对路径；不存在则返回 `null` */
export function getBundledHdcPath(): string | null {
  const override = readOverride('OPENX_HDC_PATH')
  if (override) {
    logger.info('hdc: using env override', override)
    return override
  }
  const name = process.platform === 'win32' ? 'hdc.exe' : 'hdc'
  const bundled = join(toolkitRoot(), 'hdc', platformSubdir(), name)
  logger.debug('hdc: checking bundled path', bundled, 'exists:', existsSync(bundled))
  if (existsSync(bundled)) return bundled

  logger.debug('hdc: bundled not found, searching SDK paths...')
  logger.debug('hdc: HOME =', process.env.HOME ?? '(not set)')
  logger.debug('hdc: PATH =', process.env.PATH ?? '(not set)')
  const found = findHdcInSdkPaths()
  if (found) {
    logger.info('hdc: found in SDK paths', found)
  } else {
    logger.warn('hdc: not found in bundled or SDK paths')
  }
  return found
}

/** hdckit `bin`：优先包内，其次 PATH 上的 `hdc` */
export function resolveHdcExecutable(): string {
  const resolved = getBundledHdcPath() ?? 'hdc'
  logger.info('hdc: resolved executable', resolved)
  return resolved
}

/** 已随包放置的 aapt 可执行文件绝对路径；不存在则返回 `null` */
export function getBundledAaptPath(): string | null {
  const override = readOverride('OPENX_AAPT_PATH')
  if (override) {
    logger.info('aapt: using env override', override)
    return override
  }
  const name = process.platform === 'win32' ? 'aapt.exe' : 'aapt'
  const candidate = join(toolkitRoot(), 'aapt', platformSubdir(), name)
  logger.debug('aapt: checking bundled path', candidate, 'exists:', existsSync(candidate))
  if (existsSync(candidate)) return candidate
  logger.warn('aapt: not found in bundled path')
  return null
}

/** 已随包放置的 ios_device 可执行文件绝对路径；不存在则返回 `null` */
export function getBundledIosDevicePath(): string | null {
  const override = readOverride('OPENX_IOS_DEVICE_PATH')
  if (override) {
    logger.info('ios_device: using env override', override)
    return override
  }
  const name = process.platform === 'win32' ? 'ios_device.exe' : 'ios_device'
  const candidate = join(toolkitRoot(), 'ios', platformSubdir(), name)
  logger.debug('ios_device: checking bundled path', candidate, 'exists:', existsSync(candidate))
  if (existsSync(candidate)) return candidate
  logger.warn('ios_device: not found in bundled path')
  return null
}

/** ios_device 可执行文件路径：优先包内，其次回退到 python 脚本模式（返回 null） */
export function resolveIosDeviceExecutable(): string | null {
  const resolved = getBundledIosDevicePath()
  logger.info('ios_device: resolved executable', resolved ?? '(not found, will fallback to python)')
  return resolved
}

/** 已随包放置的 scrcpy-server.jar 绝对路径；不存在则返回 `null` */
export function resolveScrcpyServerPath(): string | null {
  const override = readOverride('OPENX_SCRCPY_SERVER_PATH')
  if (override) {
    logger.info('scrcpy-server: using env override', override)
    return override
  }
  const candidate = join(toolkitRoot(), 'scrcpy-server.jar')
  logger.debug('scrcpy-server: checking bundled path', candidate, 'exists:', existsSync(candidate))
  if (existsSync(candidate)) return candidate
  logger.warn('scrcpy-server: not found in bundled path')
  return null
}

