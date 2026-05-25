import { readFile, open } from 'node:fs/promises'
import { getLogPath } from '../../log'

const MAX_BYTES = 200_000

export async function handleLogRead(): Promise<string> {
  const logPath = getLogPath()
  try {
    const fh = await open(logPath, 'r')
    try {
      const { size } = await fh.stat()
      if (size <= MAX_BYTES) {
        return await readFile(logPath, 'utf-8')
      }
      const buf = Buffer.allocUnsafe(MAX_BYTES)
      await fh.read(buf, 0, MAX_BYTES, size - MAX_BYTES)
      // trim leading incomplete line
      const str = buf.toString('utf-8')
      const newline = str.indexOf('\n')
      return newline >= 0 ? str.slice(newline + 1) : str
    } finally {
      await fh.close()
    }
  } catch {
    return ''
  }
}
