import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLogger } from '../../log'
import { shell } from './base'
import { getHdcClient } from './client'

const logger = createLogger('hdcScreencap')
const REMOTE_PATH = '/data/local/tmp/openx_screen.jpeg'

/** 截取鸿蒙设备屏幕，返回 JPEG base64 */
export async function captureHarmonyScreenshot(connectKey: string): Promise<string> {
  logger.debug('screencap', connectKey)

  await shell(connectKey, [`rm -f ${REMOTE_PATH}`, `snapshot_display -i 0 -f ${REMOTE_PATH}`])

  const localDir = join(tmpdir(), 'openx-screencap')
  await mkdir(localDir, { recursive: true })
  const localPath = join(localDir, `${connectKey.replace(/[^\w.-]+/g, '_')}_${Date.now()}.jpeg`)

  try {
    const target = getHdcClient().getTarget(connectKey)
    await target.recvFile(REMOTE_PATH, localPath)
    const buf = await readFile(localPath)
    return buf.toString('base64')
  } finally {
    await rm(localPath, { force: true }).catch(() => undefined)
  }
}
