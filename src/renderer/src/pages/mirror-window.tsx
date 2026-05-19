import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { h264ParseConfiguration } from '@yume-chan/scrcpy'
import type { FramePacket } from '../../../shared/mirror'

type Status = 'waiting' | 'connecting' | 'streaming' | 'error'

function toHex2(n: number): string {
  return n.toString(16).padStart(2, '0')
}

function toUint8Array(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v
  if (v instanceof ArrayBuffer) return new Uint8Array(v)
  return new Uint8Array(v as ArrayBuffer)
}

export function MirrorWindowPage(): React.JSX.Element {
  const deviceId = new URLSearchParams(location.search).get('deviceId') ?? ''

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const decoderRef = useRef<VideoDecoder | null>(null)
  const configDataRef = useRef<Uint8Array | null>(null)
  const configuredRef = useRef(false)
  const [status, setStatus] = useState<Status>('connecting')
  const [errorMsg, setErrorMsg] = useState('')

  const disposeDecoder = useCallback(() => {
    const dec = decoderRef.current
    if (dec && dec.state !== 'closed') {
      try { dec.close() } catch { /* ignore */ }
    }
    decoderRef.current = null
    configDataRef.current = null
    configuredRef.current = false

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  useEffect(() => {
    if (!deviceId) return

    const canvas = canvasRef.current!

    const decoder = new VideoDecoder({
      output: (frame) => {
        if (canvas.width !== frame.displayWidth || canvas.height !== frame.displayHeight) {
          canvas.width = frame.displayWidth
          canvas.height = frame.displayHeight
        }
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.drawImage(frame, 0, 0)
        frame.close()
      },
      error: (e) => {
        console.error('[mirror-window] VideoDecoder error', e)
        setErrorMsg(e.message)
        setStatus('error')
      },
    })
    decoderRef.current = decoder

    const configureAndDecode = (dec: VideoDecoder, configData: Uint8Array, frameData: Uint8Array): void => {
      try {
        const { profileIndex, constraintSet, levelIndex } = h264ParseConfiguration(configData)
        const codec = `avc1.${toHex2(profileIndex)}${toHex2(constraintSet)}${toHex2(levelIndex)}`
        dec.configure({ codec, optimizeForLatency: true })
        configuredRef.current = true
      } catch (e) {
        console.error('[mirror-window] configure error', e)
        return
      }
      const combined = new Uint8Array(configData.length + frameData.length)
      combined.set(configData)
      combined.set(frameData, configData.length)
      try {
        dec.decode(new EncodedVideoChunk({ type: 'key', timestamp: 0, data: combined }))
      } catch (e) {
        console.error('[mirror-window] first-keyframe decode error', e)
      }
    }

    // Register all IPC listeners BEFORE starting the mirror session
    // to avoid dropping frames during window load.
    const offMeta = window.api.mirror.onMetadata(() => {
      setStatus('streaming')
    })

    const offFrame = window.api.mirror.onFrame((packet: FramePacket) => {
      const canvas = canvasRef.current
      if (!canvas) return

      // HarmonyOS: polling JPEG frames
      if (packet.type === 'jpeg') {
        const blob = new Blob([new Uint8Array(packet.data).buffer], { type: 'image/jpeg' })
        createImageBitmap(blob).then((bitmap) => {
          if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
            canvas.width = bitmap.width
            canvas.height = bitmap.height
          }
          const ctx = canvas.getContext('2d')
          if (ctx) ctx.drawImage(bitmap, 0, 0)
          bitmap.close()
        }).catch((e) => console.error('[mirror-window] JPEG frame error', e))
        return
      }

      // Android: H.264 VideoDecoder
      const dec = decoderRef.current
      if (!dec || dec.state === 'closed') return

      const data = toUint8Array(packet.data)

      if (packet.type === 'configuration') {
        configDataRef.current = data
        configuredRef.current = false
        return
      }

      const configData = configDataRef.current
      if (!configData) return

      if (!configuredRef.current) {
        if (!packet.keyframe) return
        configureAndDecode(dec, configData, data)
        return
      }

      if (packet.keyframe) {
        if (dec.decodeQueueSize > 0) {
          dec.reset()
          configuredRef.current = false
          configureAndDecode(dec, configData, data)
        } else {
          try {
            dec.decode(new EncodedVideoChunk({ type: 'key', timestamp: 0, data }))
          } catch (e) {
            console.error('[mirror-window] keyframe decode error', e)
          }
        }
        return
      }

      try {
        dec.decode(new EncodedVideoChunk({ type: 'delta', timestamp: 0, data }))
      } catch (e) {
        console.error('[mirror-window] delta decode error', e)
      }
    })

    const offError = window.api.mirror.onError((msg) => {
      setErrorMsg(msg)
      setStatus('error')
    })

    // Now that listeners are registered, start the mirror session
    window.api.mirror.start(deviceId).then((result) => {
      if (!result.ok) {
        setErrorMsg(result.error)
        setStatus('error')
      }
    })

    return () => {
      offMeta()
      offFrame()
      offError()
      window.api.mirror.stop(deviceId)
      disposeDecoder()
    }
  }, [deviceId, disposeDecoder])

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      {status === 'connecting' && (
        <div className="flex flex-col items-center gap-2 text-white/50">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">正在连接 scrcpy…</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex flex-col items-center gap-2 text-red-400">
          <AlertCircle className="w-8 h-8" />
          <span className="text-sm max-w-xs text-center">{errorMsg}</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{ display: status === 'streaming' ? 'block' : 'none' }}
      />
    </div>
  )
}
