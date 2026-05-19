import { useCallback, useEffect, useRef, useState } from 'react'
import { Monitor, Square, AlertCircle, Loader2, ExternalLink, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDevicesStore } from '@/stores/devices'
import { h264ParseConfiguration } from '@yume-chan/scrcpy'
import type { FramePacket } from '../../../shared/mirror'

type Status = 'idle' | 'connecting' | 'streaming' | 'error'

function toHex2(n: number): string {
  return n.toString(16).padStart(2, '0')
}

function toUint8Array(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v
  if (v instanceof ArrayBuffer) return new Uint8Array(v)
  return new Uint8Array(v as ArrayBuffer)
}

export function MirrorPage(): React.JSX.Element {
  const selectedId = useDevicesStore((s) => s.selectedId)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const decoderRef = useRef<VideoDecoder | null>(null)
  const configDataRef = useRef<Uint8Array | null>(null)
  const configuredRef = useRef(false)
  const cleanupListenersRef = useRef<(() => void) | null>(null)

  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [windowOpen, setWindowOpen] = useState(false)

  const disposeDecoder = useCallback(() => {
    cleanupListenersRef.current?.()
    cleanupListenersRef.current = null

    const dec = decoderRef.current
    if (dec && dec.state !== 'closed') {
      try {
        dec.close()
      } catch {
        /* ignore */
      }
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

  const stop = useCallback(async () => {
    if (!selectedId) return
    await window.api.mirror.stop(selectedId)
    disposeDecoder()
    setStatus('idle')
  }, [selectedId, disposeDecoder])

  const start = useCallback(async () => {
    if (!selectedId) return
    setStatus('connecting')
    setErrorMsg('')
    disposeDecoder()

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
        console.error('[mirror] VideoDecoder error', e)
        setErrorMsg(e.message)
        setStatus('error')
      }
    })
    decoderRef.current = decoder

    const configureAndDecode = (
      dec: VideoDecoder,
      configData: Uint8Array,
      frameData: Uint8Array
    ): void => {
      try {
        const { profileIndex, constraintSet, levelIndex } = h264ParseConfiguration(configData)
        const codec = `avc1.${toHex2(profileIndex)}${toHex2(constraintSet)}${toHex2(levelIndex)}`
        dec.configure({ codec, optimizeForLatency: true })
        configuredRef.current = true
      } catch (e) {
        console.error('[mirror] configure error', e)
        return
      }
      const combined = new Uint8Array(configData.length + frameData.length)
      combined.set(configData)
      combined.set(frameData, configData.length)
      try {
        dec.decode(new EncodedVideoChunk({ type: 'key', timestamp: 0, data: combined }))
      } catch (e) {
        console.error('[mirror] first-keyframe decode error', e)
      }
    }

    const offMeta = window.api.mirror.onMetadata(() => {
      setStatus('streaming')
    })

    const offFrame = window.api.mirror.onFrame((packet: FramePacket) => {
      const canvas = canvasRef.current
      if (!canvas) return

      // HarmonyOS: polling JPEG frames
      if (packet.type === 'jpeg') {
        const blob = new Blob([new Uint8Array(packet.data).buffer], { type: 'image/jpeg' })
        createImageBitmap(blob)
          .then((bitmap) => {
            if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
              canvas.width = bitmap.width
              canvas.height = bitmap.height
            }
            const ctx = canvas.getContext('2d')
            if (ctx) ctx.drawImage(bitmap, 0, 0)
            bitmap.close()
          })
          .catch((e) => console.error('[mirror] JPEG frame error', e))
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
            console.error('[mirror] keyframe decode error', e)
          }
        }
        return
      }

      try {
        dec.decode(new EncodedVideoChunk({ type: 'delta', timestamp: 0, data }))
      } catch (e) {
        console.error('[mirror] delta decode error', e)
      }
    })

    const offError = window.api.mirror.onError((msg) => {
      setErrorMsg(msg)
      setStatus('error')
      cleanupListenersRef.current?.()
      cleanupListenersRef.current = null
    })

    cleanupListenersRef.current = () => {
      offMeta()
      offFrame()
      offError()
    }

    const result = await window.api.mirror.start(selectedId)
    if (!result.ok) {
      disposeDecoder()
      setErrorMsg(result.error)
      setStatus('error')
    }
  }, [selectedId, disposeDecoder])

  // Open a separate mirror window; the window handles its own start/stop
  const openWindow = useCallback(async () => {
    if (!selectedId) return
    const result = await window.api.mirror.openWindow(selectedId)
    if (!result.ok) {
      setErrorMsg(result.error ?? '无法打开镜像窗口')
      setStatus('error')
      return
    }
    setWindowOpen(true)
  }, [selectedId])

  // Reset when the user closes the mirror window
  useEffect(() => {
    const off = window.api.mirror.onWindowClosed(() => {
      setWindowOpen(false)
      setStatus('idle')
    })
    return off
  }, [])

  useEffect(() => {
    return () => {
      disposeDecoder()
    }
  }, [selectedId, disposeDecoder])

  const isAndroid = selectedId?.startsWith('android:')
  const isHarmony = selectedId?.startsWith('harmony:')
  const canStart = !!selectedId && (!!isAndroid || !!isHarmony)
  const isActive = status === 'streaming' || status === 'connecting'

  return (
    <div className="flex flex-col h-full gap-4">
      {/* toolbar */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="ml-auto flex gap-2">
          {isActive && (
            <Button size="sm" variant="outline" onClick={stop}>
              <Square className="w-4 h-4 mr-1" />
              停止
            </Button>
          )}
        </div>
      </div>

      {/* canvas area */}
      <div className="flex-1 flex items-center justify-center rounded-xl overflow-hidden relative">
        {!selectedId && <p className="text-sm text-muted-foreground">请先选择设备</p>}
        {selectedId && !isAndroid && !isHarmony && (
          <p className="text-sm text-muted-foreground">屏幕镜像暂不支持该设备平台</p>
        )}
        {isAndroid || isHarmony
          ? status === 'idle' &&
            !windowOpen && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <div className="w-20 h-18 rounded-2xl bg-muted flex items-center justify-center">
                  <Monitor className="w-13 h-13" />
                </div>

                <p>屏幕镜像</p>
                <p className="text-xs">选择一个设备开始镜像</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={openWindow} disabled={!canStart}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                    弹出窗口
                  </Button>
                  <Button size="sm" onClick={start} disabled={!canStart}>
                    <Play className="w-4 h-4 mr-1" />
                    开始镜像
                  </Button>
                </div>

                {!selectedId && <p className="text-sm">请先在标题栏选择设备</p>}
              </div>
            )
          : null}
        {windowOpen && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ExternalLink className="w-8 h-8" />
            <span className="text-sm">画面显示在独立窗口中</span>
          </div>
        )}
        {!windowOpen && status === 'connecting' && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">正在连接设备…</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-2 text-destructive">
            <AlertCircle className="w-8 h-8" />
            <span className="text-sm max-w-xs text-center">{errorMsg}</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain"
          style={{ display: !windowOpen && status === 'streaming' ? 'block' : 'none' }}
        />
      </div>
    </div>
  )
}
