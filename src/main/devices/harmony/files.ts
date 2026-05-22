import { createLogger } from '../../log'
import { shell } from './base'
import { getHdcClient } from './client'
import type { FileEntry } from '../../../shared/files'

const logger = createLogger('harmony:files')

const LS_LINE_RE =
  /^([drwxs-]+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+)$/

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

export async function listHarmonyFiles(connectKey: string, path: string): Promise<FileEntry[]> {
  const output = await shell(connectKey, `ls -la "${path}" 2>&1`)
  return parseLsOutput(output, path)
}

export async function downloadHarmonyFile(
  connectKey: string,
  remotePath: string,
  localPath: string,
): Promise<void> {
  const target = getHdcClient().getTarget(connectKey)
  await target.recvFile(remotePath, localPath)
  logger.info('downloaded %s → %s', remotePath, localPath)
}

export async function uploadHarmonyFile(
  connectKey: string,
  localPath: string,
  remotePath: string,
): Promise<void> {
  const target = getHdcClient().getTarget(connectKey)
  await target.sendFile(localPath, remotePath)
  logger.info('uploaded %s → %s', localPath, remotePath)
}

export async function deleteHarmonyFile(connectKey: string, remotePath: string): Promise<void> {
  await shell(connectKey, `rm -rf "${remotePath}"`)
}

export async function mkdirHarmony(connectKey: string, remotePath: string): Promise<void> {
  await shell(connectKey, `mkdir -p "${remotePath}"`)
}
