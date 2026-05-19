import { app } from 'electron'
import { join, normalize } from 'node:path'
import { existsSync } from 'node:fs'

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

/** 已随包放置的 adb 可执行文件绝对路径；不存在则返回 `null` */
export function getBundledAdbPath(): string | null {
  const override = readOverride('OPENX_ADB_PATH')
  if (override) {
    return override
  }
  const name = process.platform === 'win32' ? 'adb.exe' : 'adb'
  const candidate = join(toolkitRoot(), 'adb', platformSubdir(), name)
  return existsSync(candidate) ? candidate : null
}

/** adbkit `bin`：优先包内，其次 PATH 上的 `adb` */
export function resolveAdbExecutable(): string {
  return getBundledAdbPath() ?? 'adb'
}

/** 已随包放置的 hdc 可执行文件绝对路径；不存在则返回 `null` */
export function getBundledHdcPath(): string | null {
  const override = readOverride('OPENX_HDC_PATH')
  if (override) {
    return override
  }
  const name = process.platform === 'win32' ? 'hdc.exe' : 'hdc'
  const candidate = join(toolkitRoot(), 'hdc', platformSubdir(), name)
  return existsSync(candidate) ? candidate : null
}

/** hdckit `bin`：优先包内，其次 PATH 上的 `hdc` */
export function resolveHdcExecutable(): string {
  return getBundledHdcPath() ?? 'hdc'
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