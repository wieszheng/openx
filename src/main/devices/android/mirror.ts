import net from 'node:net'
import { ScrcpyOptions3_1 } from '@yume-chan/scrcpy'
import { createLogger } from '../../log'
import { getAdbClient } from './client'
import { resolveScrcpyServerPath } from '../toolkit-paths'
import type { FramePacket } from '../../../shared/mirror'

const logger = createLogger('androidMirror')

const SERVER_PATH = '/data/local/tmp/scrcpy-server.jar'

export interface MirrorOptions {
  maxSize?: number
  bitRate?: number
}

export interface MirrorMetadata {
  deviceName: string
  width: number
  height: number
}

interface Session {
  stop(): void
}

const sessions = new Map<string, Session>()

// Per-serial generation counter: each new startAndroidMirror call increments
// it so that any in-progress async execution from a previous call can detect
// it has been superseded and bail out before establishing a session.
const generations = new Map<string, number>()

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

function socketToReadableStream(socket: net.Socket): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      socket.on('data', (data: Buffer) => controller.enqueue(new Uint8Array(data)))
      socket.on('end', () => controller.close())
      socket.on('error', (e: Error) => controller.error(e))
    },
    cancel() {
      socket.destroy()
    },
  })
}

export async function startAndroidMirror(
  serial: string,
  options: MirrorOptions,
  onMetadata: (meta: MirrorMetadata) => void,
  onData: (packet: FramePacket) => void,
  onError: (err: Error) => void,
): Promise<void> {
  stopAndroidMirror(serial)

  const gen = (generations.get(serial) ?? 0) + 1
  generations.set(serial, gen)
  const isStale = (): boolean => generations.get(serial) !== gen

  logger.debug('startMirror gen=%d serial=%s', gen, serial)

  const device = getAdbClient().getDevice(serial)

  // Kill any leftover scrcpy server on the device — its abstract socket
  // (localabstract:scrcpy) stays bound until the process dies, causing
  // "Address already in use" on the next start.
  try {
    const killShell = await device.shell(
      'pkill -f com.genymobile.scrcpy.Server 2>/dev/null; true',
    )
    await new Promise<void>((res) => {
      killShell.on('end', res)
      killShell.on('error', () => res())
      setTimeout(res, 1000)
    })
    logger.debug('gen=%d killed leftover scrcpy server (if any)', gen)
  } catch {
    // pkill not available on this device — proceed anyway
  }

  if (isStale()) {
    logger.debug('gen=%d superseded after pkill, aborting', gen)
    return
  }

  const jarPath = resolveScrcpyServerPath()
  if (!jarPath) {
    throw new Error(
      'scrcpy-server.jar not found. Place it at resources/toolkit/scrcpy-server.jar ' +
      'or set OPENX_SCRCPY_SERVER_PATH.',
    )
  }

  logger.debug('gen=%d pushing scrcpy-server.jar', gen)
  const transfer = await device.push(jarPath, SERVER_PATH)
  await new Promise<void>((res, rej) => {
    transfer.on('end', res)
    transfer.on('error', rej)
  })

  if (isStale()) {
    logger.debug('gen=%d superseded after jar push, aborting', gen)
    return
  }

  logger.debug('gen=%d push done', gen)

  const scrcpyOptions = new ScrcpyOptions3_1({
    maxSize: options.maxSize ?? 1080,
    videoBitRate: options.bitRate ?? 8_000_000,
    tunnelForward: true,
    control: false,
    audio: false,
    videoCodec: 'h264',
    sendDummyByte: false,
  })

  const args = scrcpyOptions.serialize().join(' ')
  logger.debug('gen=%d starting scrcpy server', gen)
  const serverShell = await device.shell(
    `CLASSPATH=${SERVER_PATH} app_process /system/bin com.genymobile.scrcpy.Server 3.1 ${args}`,
  )
  serverShell.on('readable', () => {
    const data: Buffer | null = serverShell.read()
    if (data) logger.debug('scrcpy server stdout:', data.toString().trim())
  })
  serverShell.on('error', (e: Error) => logger.warn('server shell error', e))

  const localPort = await getAvailablePort()

  if (isStale()) {
    logger.debug('gen=%d superseded after getPort, aborting', gen)
    serverShell.destroy()
    return
  }

  await device.forward(`tcp:${localPort}`, 'localabstract:scrcpy')
  logger.debug('gen=%d forwarded tcp:%d → localabstract:scrcpy', gen, localPort)

  const MAX_ATTEMPTS = 20
  const RETRY_MS = 300

  let socket: net.Socket | null = null
  let videoStream!: ReadableStream<Uint8Array>

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (isStale()) {
      logger.debug('gen=%d superseded during connect retry, aborting', gen)
      serverShell.destroy()
      return
    }
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_MS))

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
      logger.debug('gen=%d metadata parsed attempt=%d deviceName=%s %dx%d',
        gen, attempt + 1,
        result.metadata.deviceName ?? '(empty)',
        result.metadata.width ?? 0,
        result.metadata.height ?? 0,
      )
      onMetadata({
        deviceName: result.metadata.deviceName ?? '',
        width: result.metadata.width ?? 0,
        height: result.metadata.height ?? 0,
      })
      break
    } catch (e) {
      s.destroy()
      logger.debug('gen=%d attempt %d failed (%s), retrying…', gen, attempt + 1, (e as Error).message)
    }
  }

  if (!socket) {
    serverShell.destroy()
    if (!isStale()) {
      throw new Error('scrcpy server failed to start after maximum retries')
    }
    return
  }

  if (isStale()) {
    logger.debug('gen=%d superseded after connect, aborting', gen)
    socket.destroy()
    serverShell.destroy()
    return
  }

  const cleanup = (): void => {
    socket.destroy()
    serverShell.destroy()
    sessions.delete(serial)
    logger.debug('mirror stopped serial=%s gen=%d', serial, gen)
  }

  sessions.set(serial, { stop: cleanup })

  // scrcpy frame format (sendFrameMeta=true, the default):
  //   [PTS: u64 big-endian][SIZE: u32 big-endian][DATA: SIZE bytes]
  // PTS bit-63 set → configuration packet (SPS+PPS)
  // PTS bit-62 set → keyframe
  const PTS_CONFIG = 1n << 63n
  const PTS_KEYFRAME = 1n << 62n

  const reader = (videoStream as any).getReader()
  let buf = Buffer.alloc(0)

  const pump = async (): Promise<void> => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf = Buffer.concat([buf, Buffer.from(value as Uint8Array)])

        while (buf.length >= 12) {
          const pts = buf.readBigUInt64BE(0)
          const size = buf.readUInt32BE(8)
          if (buf.length < 12 + size) break
          const data = buf.subarray(12, 12 + size)
          buf = buf.subarray(12 + size)

          if (pts === PTS_CONFIG) {
            onData({ type: 'configuration', data: Buffer.from(data) })
          } else if ((pts & PTS_KEYFRAME) !== 0n) {
            onData({ type: 'data', data: Buffer.from(data), keyframe: true })
          } else {
            onData({ type: 'data', data: Buffer.from(data), keyframe: false })
          }
        }
      }
    } catch (e) {
      if (sessions.has(serial)) {
        onError(e instanceof Error ? e : new Error(String(e)))
        cleanup()
      }
    }
  }

  socket.on('error', (e: Error) => {
    logger.warn('mirror socket error', e)
    if (sessions.has(serial)) {
      onError(e)
      cleanup()
    }
  })

  pump()
}

export function stopAndroidMirror(serial: string): void {
  sessions.get(serial)?.stop()
}
