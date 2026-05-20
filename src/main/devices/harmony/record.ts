import { mkdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { app } from 'electron'
import { createLogger } from '../../log'
import { shell } from './base'
import { getHdcClient } from './client'
import { getExportDir } from '../../settings'

const logger = createLogger('harmony:record')

const SCREEN_RECORDER_BUNDLE = 'com.huawei.hmos.screenrecorder'
const SCREEN_RECORDER_ABILITY = 'com.huawei.hmos.screenrecorder.ServiceExtAbility'
const DEVICE_TMP = '/data/local/tmp'

interface RecordSession {
  filename: string
  startedAt: number
}

const sessions = new Map<string, RecordSession>()

async function outputDir(): Promise<string> {
  const custom = getExportDir()
  const dir = custom ?? (app.isPackaged
    ? join(app.getPath('videos'), 'OpenX')
    : join(app.getPath('temp'), 'openx-records'))
  await mkdir(dir, { recursive: true })
  return dir
}

function makeFilename(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `openx_${ts}.mp4`
}

function parseMediaUri(output: string): string | null {
  // mediatool query 输出形如: "file://media/Photo/1090/VID_xxx/temp.mp4"
  // 取最后一个匹配的 URI
  const matches = [...output.matchAll(/"(file:\/\/media\/[^"]+)"/g)]
  if (matches.length === 0) return null
  return matches[matches.length - 1][1]
}

export function isHarmonyRecording(connectKey: string): boolean {
  return sessions.has(connectKey)
}

export async function startHarmonyRecord(connectKey: string): Promise<void> {
  if (sessions.has(connectKey)) throw new Error('录制已在进行中')

  const filename = makeFilename()
  const cmd = `aa start -b ${SCREEN_RECORDER_BUNDLE} -a ${SCREEN_RECORDER_ABILITY} --ps "CustomizedFileName" ${filename}`

  const result = await shell(connectKey, cmd)
  if (!result.includes('start ability successfully')) {
    throw new Error(`启动录屏失败: ${result}`)
  }

  sessions.set(connectKey, { filename, startedAt: Date.now() })
  logger.info('harmony recording started connectKey=%s filename=%s', connectKey, filename)
}

export async function stopHarmonyRecord(
  connectKey: string,
): Promise<{ filePath: string; durationSec: number }> {
  const session = sessions.get(connectKey)
  if (!session) throw new Error('没有进行中的录制')

  const durationSec = Math.round((Date.now() - session.startedAt) / 1000)
  sessions.delete(connectKey)

  // 发送停止命令（无参数调用同一 ability）
  const stopCmd = `aa start -b ${SCREEN_RECORDER_BUNDLE} -a ${SCREEN_RECORDER_ABILITY}`
  await shell(connectKey, stopCmd)
  logger.info('harmony recording stop sent connectKey=%s', connectKey)

  // 等待录屏进程完成文件写入（stop 命令是异步的）
  await new Promise((r) => setTimeout(r, 2000))

  // 查询媒体库 URI
  const queryOut = await shell(connectKey, `mediatool query ${session.filename} -u`)
  const uri = parseMediaUri(queryOut)

  if (!uri) {
    throw new Error(`录制文件未找到: ${session.filename}`)
  }

  logger.info('media uri resolved: %s', uri)

  // 将媒体文件复制到设备临时目录
  const recvOut = await shell(connectKey, `mediatool recv ${uri} ${DEVICE_TMP}`)
  logger.debug('mediatool recv output: %s', recvOut)

  const devicePath = `${DEVICE_TMP}/${session.filename}`

  // 准备本地输出路径
  const dir = await outputDir()
  const localPath = join(dir, basename(session.filename))

  // 从设备拉取到本地
  const target = getHdcClient().getTarget(connectKey)
  await target.recvFile(devicePath, localPath)
  logger.info('harmony recording saved %s (%ds)', localPath, durationSec)

  // 清理设备临时文件
  await shell(connectKey, `rm -f ${devicePath}`).catch(() => {/* ignore */})

  return { filePath: localPath, durationSec }
}
