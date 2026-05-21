import net from 'node:net'
import { openSync, writeSync, closeSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { ScrcpyOptions3_1 } from '@yume-chan/scrcpy'
import { Muxer, StreamTarget } from 'mp4-muxer'
import { createLogger } from '../../log'
import { getAdbClient } from './client'
import { resolveScrcpyServerPath } from '../toolkit-paths'
import { getExportDir } from '../../settings'

const SERVER_PATH = '/data/local/tmp/scrcpy-server.jar'
const logger = createLogger('android:record')

const PTS_CONFIG_BIT = 1n << 63n
const PTS_KEYFRAME_BIT = 1n << 62n
const PTS_META_MASK = PTS_CONFIG_BIT | PTS_KEYFRAME_BIT

interface RecordSession {
  startedAt: number
  stop: () => Promise<string>
}

const sessions = new Map<string, RecordSession>()

async function getOutputPath(): Promise<string> {
  const custom = await getExportDir()
  const dir = custom ?? (app.isPackaged
    ? join(app.getPath('videos'), 'OpenX')
    : join(app.getPath('temp'), 'openx-records'))
  await mkdir(dir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return join(dir, `openx_${ts}.mp4`)
}

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as net.AddressInfo
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

// 'close' event handles socket.destroy() which doesn't emit 'end'
function socketToReadableStream(socket: net.Socket): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      socket.on('data', (data: Buffer) => controller.enqueue(new Uint8Array(data)))
      socket.on('end', () => controller.close())
      socket.on('close', () => { try { controller.close() } catch { /* already closed */ } })
      socket.on('error', (e: Error) => controller.error(e))
    },
    cancel() { socket.destroy() },
  })
}

// Split Annex B NAL unit payloads (strips start codes)
function splitNalUnits(buf: Uint8Array): Uint8Array[] {
  const units: Uint8Array[] = []
  let i = 0
  while (i < buf.length) {
    let skip = 0
    if (i + 3 < buf.length && buf[i] === 0 && buf[i + 1] === 0 && buf[i + 2] === 0 && buf[i + 3] === 1) {
      skip = 4
    } else if (i + 2 < buf.length && buf[i] === 0 && buf[i + 1] === 0 && buf[i + 2] === 1) {
      skip = 3
    } else { i++; continue }
    const start = i + skip
    let end = buf.length
    for (let j = start + 1; j < buf.length - 2; j++) {
      if (buf[j] === 0 && buf[j + 1] === 0 &&
        (buf[j + 2] === 1 || (j + 3 < buf.length && buf[j + 2] === 0 && buf[j + 3] === 1))) {
        end = j; break
      }
    }
    if (start < end) units.push(buf.subarray(start, end))
    i = end
  }
  return units
}

// Annex B → AVCC (4-byte length-prefixed NAL units) for mp4-muxer
function annexBToAvcc(buf: Uint8Array): Uint8Array {
  const nals = splitNalUnits(buf)
  if (nals.length === 0) return buf
  const total = nals.reduce((s, n) => s + 4 + n.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const nal of nals) {
    out[offset] = (nal.length >>> 24) & 0xFF
    out[offset + 1] = (nal.length >>> 16) & 0xFF
    out[offset + 2] = (nal.length >>> 8) & 0xFF
    out[offset + 3] = nal.length & 0xFF
    out.set(nal, offset + 4)
    offset += 4 + nal.length
  }
  return out
}

interface AvcConfig {
  record: Uint8Array  // AVCDecoderConfigurationRecord
  codecStr: string    // e.g. 'avc1.640029'
}

// Build AVCDecoderConfigurationRecord from scrcpy's SPS+PPS Annex B config packet
function buildAvcConfig(configData: Uint8Array): AvcConfig {
  const nals = splitNalUnits(configData)
  const sps = nals.find(n => (n[0] & 0x1F) === 7)
  const pps = nals.find(n => (n[0] & 0x1F) === 8)
  if (!sps || !pps) throw new Error('config packet missing SPS/PPS')

  const record = new Uint8Array(6 + 2 + sps.length + 1 + 2 + pps.length)
  let i = 0
  record[i++] = 1; record[i++] = sps[1]; record[i++] = sps[2]; record[i++] = sps[3]
  record[i++] = 0xFF; record[i++] = 0xE1
  record[i++] = (sps.length >>> 8) & 0xFF; record[i++] = sps.length & 0xFF
  record.set(sps, i); i += sps.length
  record[i++] = 1
  record[i++] = (pps.length >>> 8) & 0xFF; record[i++] = pps.length & 0xFF
  record.set(pps, i)

  const codecStr = `avc1.${sps[1].toString(16).padStart(2, '0')}${sps[2].toString(16).padStart(2, '0')}${sps[3].toString(16).padStart(2, '0')}`
  return { record, codecStr }
}

export function isAndroidRecording(serial: string): boolean {
  return sessions.has(serial)
}

export async function startAndroidRecord(serial: string): Promise<void> {
  if (sessions.has(serial)) throw new Error('录制已在进行中')

  const device = getAdbClient().getDevice(serial)

  // Kill any leftover scrcpy server (its abstract socket stays bound until process dies)
  try {
    const killShell = await device.shell('pkill -f com.genymobile.scrcpy.Server 2>/dev/null; true')
    await new Promise<void>((res) => {
      killShell.on('end', res)
      killShell.on('error', () => res())
      setTimeout(res, 1000)
    })
  } catch { /* pkill not available, proceed */ }

  const jarPath = resolveScrcpyServerPath()
  if (!jarPath) throw new Error('scrcpy-server.jar not found. Set OPENX_SCRCPY_SERVER_PATH or place at resources/toolkit/scrcpy-server.jar')

  const transfer = await device.push(jarPath, SERVER_PATH)
  await new Promise<void>((res, rej) => { transfer.on('end', res); transfer.on('error', rej) })

  const scrcpyOptions = new ScrcpyOptions3_1({
    maxSize: 1080,
    videoBitRate: 4_000_000,
    tunnelForward: true,
    control: false,
    audio: false,
    videoCodec: 'h264',
    sendDummyByte: false,
  })

  const args = scrcpyOptions.serialize().join(' ')
  const serverShell = await device.shell(
    `CLASSPATH=${SERVER_PATH} app_process /system/bin com.genymobile.scrcpy.Server 3.1 ${args}`,
  )
  serverShell.on('error', (e: Error) => logger.warn('server shell error', e))

  const localPort = await getAvailablePort()
  await device.forward(`tcp:${localPort}`, 'localabstract:scrcpy')

  // Connect and read metadata (width/height) before setting up muxer
  let socket: net.Socket | null = null
  let videoStream!: ReadableStream<Uint8Array>
  let width = 1080
  let height = 1920

  for (let attempt = 0; attempt < 20; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300))
    const s = await new Promise<net.Socket | null>((resolve) => {
      const sock = net.createConnection({ port: localPort, host: '127.0.0.1' })
      sock.once('connect', () => resolve(sock))
      sock.once('error', () => { sock.destroy(); resolve(null) })
    })
    if (!s) continue
    try {
      const rawStream = socketToReadableStream(s)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await scrcpyOptions.parseVideoStreamMetadata(rawStream as any)
      videoStream = result.stream as ReadableStream<Uint8Array>
      socket = s
      width = result.metadata.width ?? 1080
      height = result.metadata.height ?? 1920
      logger.info('scrcpy connected for recording %dx%d', width, height)
      break
    } catch (e) {
      s.destroy()
      logger.debug('connect attempt %d failed: %s', attempt + 1, (e as Error).message)
    }
  }

  if (!socket) {
    serverShell.destroy()
    throw new Error('scrcpy server failed to start after maximum retries')
  }

  const localPath = await getOutputPath()
  const fd = openSync(localPath, 'w')
  const target = new StreamTarget({
    onData(data: Uint8Array, position: number) {
      writeSync(fd, data, 0, data.byteLength, position)
    },
  })
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width, height },
    fastStart: 'fragmented',
  })

  const cleanup = () => {
    socket!.destroy()
    serverShell.destroy()
    sessions.delete(serial)
  }

  // State shared between pump and stop
  let stopRequested = false
  let avcConfig: AvcConfig | null = null
  let firstPts: bigint | null = null

  // Deferred write: hold current chunk until next arrives so duration can be computed
  type PendingChunk = {
    data: Uint8Array
    type: 'key' | 'delta'
    timestamp: number
    meta?: { decoderConfig: { codec: string; description: ArrayBuffer } }
  }
  let pendingChunk: PendingChunk | null = null

  const flushPending = (duration: number) => {
    if (!pendingChunk) return
    muxer.addVideoChunkRaw(pendingChunk.data, pendingChunk.type, pendingChunk.timestamp, duration, pendingChunk.meta)
    pendingChunk = null
  }

  const reader = (videoStream as any).getReader()
  let buf = Buffer.alloc(0)

  const pumpDone = new Promise<void>((resolve) => {
    const pump = async (): Promise<void> => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done || stopRequested) break
          buf = Buffer.concat([buf, Buffer.from(value as Uint8Array)])

          while (buf.length >= 12) {
            const pts = buf.readBigUInt64BE(0)
            const size = buf.readUInt32BE(8)
            if (buf.length < 12 + size) break
            const data = buf.subarray(12, 12 + size)
            buf = buf.subarray(12 + size)

            if (pts === PTS_CONFIG_BIT) {
              try { avcConfig = buildAvcConfig(Buffer.from(data)) } catch (e) {
                logger.warn('buildAvcConfig failed: %s', (e as Error).message)
              }
            } else {
              const isKeyframe = (pts & PTS_KEYFRAME_BIT) !== 0n
              const actualPts = pts & ~PTS_META_MASK
              if (firstPts === null) firstPts = actualPts
              const timestamp = Number(actualPts - firstPts)

              // Flush previous chunk now that we know its duration
              flushPending(timestamp - (pendingChunk?.timestamp ?? 0))

              const avcc = annexBToAvcc(Buffer.from(data))
              const meta = avcConfig ? {
                decoderConfig: {
                  codec: avcConfig.codecStr,
                  description: avcConfig.record.buffer.slice(
                    avcConfig.record.byteOffset,
                    avcConfig.record.byteOffset + avcConfig.record.byteLength,
                  ) as ArrayBuffer,
                },
              } : undefined
              if (avcConfig) avcConfig = null  // pass decoderConfig once

              pendingChunk = { data: avcc, type: isKeyframe ? 'key' : 'delta', timestamp, meta }
            }
          }
        }
      } catch (e) {
        if (!stopRequested) logger.warn('pump error: %s', (e as Error).message)
      } finally {
        resolve()
      }
    }
    void pump()
  })

  socket.on('error', (e: Error) => {
    logger.warn('record socket error', e)
    if (sessions.has(serial)) cleanup()
  })

  const session: RecordSession = {
    startedAt: Date.now(),
    stop: async () => {
      stopRequested = true
      cleanup()
      reader.cancel().catch(() => {})
      await Promise.race([pumpDone, new Promise<void>((r) => setTimeout(r, 3000))])

      // Flush last buffered chunk with a default 30fps duration
      flushPending(33333)

      muxer.finalize()
      closeSync(fd)
      logger.info('recording saved to %s', localPath)
      return localPath
    },
  }

  sessions.set(serial, session)
  logger.info('recording started serial=%s path=%s', serial, localPath)
}

export async function stopAndroidRecord(serial: string): Promise<{ filePath: string; durationSec: number }> {
  const session = sessions.get(serial)
  if (!session) throw new Error('没有进行中的录制')
  const durationSec = Math.round((Date.now() - session.startedAt) / 1000)
  const filePath = await session.stop()
  return { filePath, durationSec }
}
