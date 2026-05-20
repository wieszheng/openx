import { app } from 'electron'
import { join, normalize } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'

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
      return normalize(c)
    }
  }
  return normalize(join(app.getAppPath(), 'resources', 'toolkit'))
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
  if (p && existsSync(p)) {
    return p
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
    if (existsSync(c)) return c
  }
  return null
}

/** 已随包放置的 adb 可执行文件绝对路径；不存在则返回 `null` */
export function getBundledAdbPath(): string | null {
  const override = readOverride('OPENX_ADB_PATH')
  if (override) {
    return override
  }
  const name = process.platform === 'win32' ? 'adb.exe' : 'adb'
  const candidate = join(toolkitRoot(), 'adb', platformSubdir(), name)
  if (existsSync(candidate)) return candidate
  return findAdbInCommonPaths()
}

/** adbkit `bin`：优先包内，其次 PATH 上的 `adb` */
export function resolveAdbExecutable(): string {
  return getBundledAdbPath() ?? 'adb'
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
    if (existsSync(c)) return c
  }

  // ~/Library/command-line-tools/sdk/<version>/openharmony/toolchains/hdc
  const cliToolsBase = join(home, 'Library', 'command-line-tools', 'sdk')
  if (existsSync(cliToolsBase)) {
    let versions: string[]
    try { versions = readdirSync(cliToolsBase) } catch { versions = [] }
    // 'default' 优先，其次按字母倒序取最新版本
    versions.sort((a, b) => (a === 'default' ? -1 : b === 'default' ? 1 : b.localeCompare(a)))
    for (const v of versions) {
      const candidate = join(cliToolsBase, v, 'openharmony', 'toolchains', name)
      if (existsSync(candidate)) return candidate
    }
  }

  // ~/Library/Huawei/Sdk/openharmony/<version>/toolchains/hdc
  const huaweiSdkBase = join(home, 'Library', 'Huawei', 'Sdk', 'openharmony')
  if (existsSync(huaweiSdkBase)) {
    let versions: string[]
    try { versions = readdirSync(huaweiSdkBase) } catch { versions = [] }
    versions.sort((a, b) => b.localeCompare(a))
    for (const v of versions) {
      const candidate = join(huaweiSdkBase, v, 'toolchains', name)
      if (existsSync(candidate)) return candidate
    }
  }

  return null
}

/** 已随包放置的 hdc 可执行文件绝对路径；不存在则返回 `null` */
export function getBundledHdcPath(): string | null {
  const override = readOverride('OPENX_HDC_PATH')
  if (override) {
    return override
  }
  const name = process.platform === 'win32' ? 'hdc.exe' : 'hdc'
  const bundled = join(toolkitRoot(), 'hdc', platformSubdir(), name)
  if (existsSync(bundled)) return bundled
  return findHdcInSdkPaths()
}

/** hdckit `bin`：优先包内，其次 PATH 上的 `hdc` */
export function resolveHdcExecutable(): string {
  return getBundledHdcPath() ?? 'hdc'
}

/** 已随包放置的 aapt 可执行文件绝对路径；不存在则返回 `null` */
export function getBundledAaptPath(): string | null {
  const override = readOverride('OPENX_AAPT_PATH')
  if (override) {
    return override
  }
  const name = process.platform === 'win32' ? 'aapt.exe' : 'aapt'
  const candidate = join(toolkitRoot(), 'aapt', platformSubdir(), name)
  return existsSync(candidate) ? candidate : null
}

/** 已随包放置的 scrcpy-server.jar 绝对路径；不存在则返回 `null` */
export function resolveScrcpyServerPath(): string | null {
  const override = readOverride('OPENX_SCRCPY_SERVER_PATH')
  if (override) {
    return override
  }
  const candidate = join(toolkitRoot(), 'scrcpy-server.jar')
  return existsSync(candidate) ? candidate : null
}

