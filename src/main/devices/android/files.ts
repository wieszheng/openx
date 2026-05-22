import { createWriteStream } from 'node:fs'
import { createLogger } from '../../log'
import { getAdbClient } from './client'
import type { FileEntry } from '../../../shared/files'

const logger = createLogger('android:files')

const LS_LINE_RE =
  /^([drwxs-]+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+)$/

function modeToPermStr(mode: number, isDir: boolean): string {
  const t = isDir ? 'd' : '-'
  const r = (n: string, b: number) => (mode & b ? n : '-')
  return (
    t +
    r('r', 0o400) + r('w', 0o200) + r('x', 0o100) +
    r('r', 0o040) + r('w', 0o020) + r('x', 0o010) +
    r('r', 0o004) + r('w', 0o002) + r('x', 0o001)
  )
}

function parseLsOutput(output: string, parentPath: string): FileEntry[] {
  if (output.includes('No such file') || output.includes('Permission denied')) {
    throw new Error(output.trim())
  }
  const entries: FileEntry[] = []
  for (const line of output.split('\n')) {
    const m = line.trim().match(LS_LINE_RE)
    if (!m) continue
    const name = m[8].split(' -> ')[0]
    if (!name || name === '.' || name === '..') continue
    const isDirectory = m[1][0] === 'd'
    const size = parseInt(m[5], 10)
    entries.push({
      name,
      path: parentPath === '/' ? `/${name}` : `${parentPath}/${name}`,
      isDirectory,
      size: isDirectory ? -1 : (isNaN(size) ? 0 : size),
      mtime: `${m[6]} ${m[7]}`,
      permissions: m[1],
    })
  }
  return entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

async function listViaShell(serial: string, path: string): Promise<FileEntry[]> {
  const device = getAdbClient().getDevice(serial)
  const stream = await device.shell(`ls -la "${path}" 2>&1`)
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (c: Buffer) => chunks.push(c))
    stream.on('end', resolve)
    stream.on('error', reject)
  })
  return parseLsOutput(Buffer.concat(chunks).toString(), path)
}

export async function listAndroidFiles(serial: string, path: string): Promise<FileEntry[]> {
  const device = getAdbClient().getDevice(serial)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files: any[] = await device.readdir(path)
    return files
      .filter((f) => f.name !== '.' && f.name !== '..')
      .map((f) => {
        const isDirectory = !f.isFile()
        const mtime = new Date(f.mtimeMs as number).toLocaleString('zh-CN', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })
        return {
          name: f.name as string,
          path: path === '/' ? `/${f.name}` : `${path}/${f.name}`,
          isDirectory,
          size: isDirectory ? -1 : (f.size as number),
          mtime,
          permissions: modeToPermStr(f.mode as number, isDirectory),
        }
      })
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  } catch (e) {
    logger.debug('readdir failed (%s), falling back to ls -la', (e as Error).message)
    return listViaShell(serial, path)
  }
}

export async function downloadAndroidFile(
  serial: string,
  remotePath: string,
  localPath: string,
): Promise<void> {
  const device = getAdbClient().getDevice(serial)
  const transfer = await device.pull(remotePath)
  const ws = createWriteStream(localPath)
  await new Promise<void>((resolve, reject) => {
    ws.on('finish', resolve)
    ws.on('error', reject)
    transfer.on('error', reject)
    transfer.pipe(ws)
  })
  logger.info('downloaded %s → %s', remotePath, localPath)
}

export async function uploadAndroidFile(
  serial: string,
  localPath: string,
  remotePath: string,
): Promise<void> {
  const device = getAdbClient().getDevice(serial)
  const transfer = await device.push(localPath, remotePath)
  await new Promise<void>((resolve, reject) => {
    transfer.on('end', resolve)
    transfer.on('error', reject)
  })
  logger.info('uploaded %s → %s', localPath, remotePath)
}

export async function deleteAndroidFile(serial: string, remotePath: string): Promise<void> {
  const device = getAdbClient().getDevice(serial)
  const stream = await device.shell(`rm -rf "${remotePath}"`)
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (c: Buffer) => chunks.push(c))
    stream.on('end', resolve)
    stream.on('error', reject)
  })
  const out = Buffer.concat(chunks).toString().trim()
  if (out) logger.warn('delete output: %s', out)
}

export async function mkdirAndroid(serial: string, remotePath: string): Promise<void> {
  const device = getAdbClient().getDevice(serial)
  const stream = await device.shell(`mkdir -p "${remotePath}"`)
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (c: Buffer) => chunks.push(c))
    stream.on('end', resolve)
    stream.on('error', reject)
  })
  const out = Buffer.concat(chunks).toString().trim()
  if (out) throw new Error(out)
}
