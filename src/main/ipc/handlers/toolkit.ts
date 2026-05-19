import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { promisify } from 'node:util'
import { app } from 'electron'
import type { ToolkitItemStatus, ToolkitStatusResult } from '../../../shared/toolkit-status'
import {
  getBundledAdbPath,
  getBundledHdcPath,
  resolveAdbExecutable,
  resolveHdcExecutable,
} from '../../devices/toolkit-paths'

const execFileAsync = promisify(execFile)

function toolkitRootDisplay(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'toolkit')
  }
  return normalize(join(app.getAppPath(), 'resources', 'toolkit'))
}

function detectSource(bundled: string | null, envKey: string): ToolkitItemStatus['source'] {
  const envPath = process.env[envKey]?.trim()
  if (envPath && existsSync(envPath)) return 'env'
  if (bundled) return 'bundled'
  return 'system'
}

async function probeVersion(
  executable: string,
  args: string[],
): Promise<{ ready: boolean; version?: string }> {
  try {
    const { stdout } = await execFileAsync(executable, args, {
      timeout: 5000,
      windowsHide: true,
      maxBuffer: 64 * 1024,
    })
    const firstLine = stdout.split(/\r?\n/).find((l) => l.trim())?.trim()
    return { ready: true, version: firstLine }
  } catch {
    return { ready: false }
  }
}

async function buildItem(
  name: ToolkitItemStatus['name'],
  label: string,
  bundled: string | null,
  resolved: string,
  envKey: string,
  versionArgs: string[],
): Promise<ToolkitItemStatus> {
  const source = detectSource(bundled, envKey)
  const executable = bundled ?? resolved
  const probe = await probeVersion(executable, versionArgs)
  return {
    name,
    label,
    resolved,
    bundledPath: bundled,
    source,
    ready: probe.ready,
    version: probe.version,
  }
}

export async function getToolkitStatus(): Promise<ToolkitStatusResult> {
  const adbBundled = getBundledAdbPath()
  const hdcBundled = getBundledHdcPath()


  const [adb, hdc] = await Promise.all([
    buildItem('adb', 'Android Debug Bridge', adbBundled, resolveAdbExecutable(), 'OPENX_ADB_PATH', [
      'version',
    ]),
    buildItem('hdc', 'Harmony Device Connector', hdcBundled, resolveHdcExecutable(), 'OPENX_HDC_PATH', [
      '-v',
    ]),
  ])

  return {
    toolkitRoot: toolkitRootDisplay(),
    items: [adb, hdc],
  }
}
