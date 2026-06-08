import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Crosshair, ScanText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDevicesStore } from '@/stores/devices'
import { getBaseUrl } from '@/lib/settings'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Point { x: number; y: number }
interface CanvasPoint { dx: number; dy: number; cx: number; cy: number }
interface OcrBox {
  text: string
  // device coords
  x: number; y: number; w: number; h: number
  // canvas coords
  cx: number; cy: number; cw: number; ch: number
}

interface ScreenPickerProps {
  mode: 'single' | 'dual' | 'text'
  onPick: (points: Point[], text?: string) => void
  onClose: () => void
}

export function ScreenPicker({ mode, onPick, onClose }: ScreenPickerProps) {
  const selectedId = useDevicesStore((s) => s.selectedId)
  const [loading, setLoading] = useState(true)
  const [empty, setEmpty] = useState(false)
  const [hoverPos, setHoverPos] = useState<Point | null>(null)
  const [firstPoint, setFirstPoint] = useState<CanvasPoint | null>(null)
  const [ocrBoxes, setOcrBoxes] = useState<OcrBox[]>([])
  const [ocrLoading, setOcrLoading] = useState(false)
  const [b64Ref, setB64Ref] = useState<string>('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgElRef = useRef<HTMLImageElement | null>(null)
  const scaleRef = useRef(1)

  // ── 绘制函数 ────────────────────────────────────────────────────────────
  const redraw = useCallback((
    mx?: number, my?: number,
    fp?: CanvasPoint | null,
    boxes?: OcrBox[],
  ) => {
    const canvas = canvasRef.current
    const img = imgElRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')!
    const { width: w, height: h } = canvas

    ctx.drawImage(img, 0, 0, w, h)

    // OCR 文字框
    const bxs = boxes ?? ocrBoxes
    for (const b of bxs) {
      ctx.save()
      ctx.strokeStyle = 'rgba(99,102,241,0.85)'
      ctx.lineWidth = 1.5
      ctx.fillStyle = 'rgba(99,102,241,0.10)'
      ctx.beginPath()
      ctx.roundRect(b.cx, b.cy, b.cw, b.ch, 3)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    // 十字准线
    if (mx !== undefined && my !== undefined) {
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 2
      ctx.beginPath()
      ctx.moveTo(mx, 0); ctx.lineTo(mx, h)
      ctx.moveTo(0, my); ctx.lineTo(w, my)
      ctx.stroke()
      ctx.restore()
    }

    // 起点（双点模式）
    const f = fp ?? firstPoint
    if (f) {
      if (mx !== undefined && my !== undefined) {
        ctx.save()
        ctx.strokeStyle = 'rgba(99,102,241,0.65)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 3])
        ctx.beginPath()
        ctx.moveTo(f.cx, f.cy)
        ctx.lineTo(mx, my)
        ctx.stroke()
        ctx.restore()
      }
      ctx.save()
      ctx.fillStyle = 'rgba(99,102,241,0.3)'
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(f.cx, f.cy, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      ctx.save()
      ctx.font = 'bold 11px ui-monospace, monospace'
      const label = `起 ${f.dx},${f.dy}`
      const tw = ctx.measureText(label).width
      const lx = f.cx + 10, ly = f.cy - 8
      ctx.fillStyle = 'rgba(99,102,241,0.85)'
      ctx.beginPath()
      ctx.roundRect(lx - 3, ly - 11, tw + 6, 16, 3)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(label, lx, ly)
      ctx.restore()
    }
  }, [ocrBoxes, firstPoint])

  // ── 加载截图（text 模式自动触发 OCR） ────────────────────────────────────
  useEffect(() => {
    if (!selectedId) { setEmpty(true); setLoading(false); return }
    window.api.screencap.capture(selectedId).then((res) => {
      if (!res.ok) { setEmpty(true); setLoading(false); return }
      setB64Ref(res.data)
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const maxW = containerRef.current?.clientWidth ?? 340
        const maxH = Math.floor(window.innerHeight * 0.55)
        const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight)
        scaleRef.current = scale
        canvas.width = Math.round(img.naturalWidth * scale)
        canvas.height = Math.round(img.naturalHeight * scale)
        imgElRef.current = img
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setLoading(false)
        if (mode === 'text') {
          // text 模式：截图加载完后自动触发 OCR
          void runOcr(res.data)
        }
      }
      img.src = `data:${res.mimeType};base64,${res.data}`
    })
  }, [selectedId])

  // ── OCR 识别 ─────────────────────────────────────────────────────────────
  async function runOcr(b64: string) {
    if (ocrLoading) return
    setOcrLoading(true)
    try {
      const res = await fetch(`${getBaseUrl()}/api/v1/ocr/base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64, use_cls: true, use_det: true, use_rec: true }),
        signal: AbortSignal.timeout(15000),
      })
      const json = await res.json()
      // 响应格式: { data: [ { text, box: [[x1,y1],[x2,y1],[x2,y2],[x1,y2]] } ] }
      const s = scaleRef.current
      const boxes: OcrBox[] = (json?.data ?? []).map((item: {
        text: string
        box: [[number, number], [number, number], [number, number], [number, number]]
      }) => {
        const xs = item.box.map((p) => p[0])
        const ys = item.box.map((p) => p[1])
        const x = Math.min(...xs), y = Math.min(...ys)
        const w = Math.max(...xs) - x, h = Math.max(...ys) - y
        return { text: item.text, x, y, w, h, cx: x * s, cy: y * s, cw: w * s, ch: h * s }
      })
      setOcrBoxes(boxes)
      redraw(undefined, undefined, null, boxes)
    } catch {
      // silent fail
    } finally {
      setOcrLoading(false)
    }
  }

  // ── 坐标换算 ─────────────────────────────────────────────────────────────
  function getCoords(e: React.MouseEvent<HTMLCanvasElement>): CanvasPoint {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const cx = Math.round((e.clientX - rect.left) * (canvas.width / rect.width))
    const cy = Math.round((e.clientY - rect.top) * (canvas.height / rect.height))
    const s = scaleRef.current
    return { dx: Math.round(cx / s), dy: Math.round(cy / s), cx, cy }
  }

  function hitOcrBox(cx: number, cy: number): OcrBox | null {
    for (const b of ocrBoxes) {
      if (cx >= b.cx && cx <= b.cx + b.cw && cy >= b.cy && cy <= b.cy + b.ch) return b
    }
    return null
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { dx, dy, cx, cy } = getCoords(e)
    setHoverPos({ x: dx, y: dy })
    redraw(cx, cy, firstPoint)
  }

  function handleMouseLeave() {
    setHoverPos(null)
    redraw(undefined, undefined, firstPoint)
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const pt = getCoords(e)
    const hit = hitOcrBox(pt.cx, pt.cy)
    const finalPt = hit
      ? { dx: Math.round(hit.x + hit.w / 2), dy: Math.round(hit.y + hit.h / 2), cx: Math.round(hit.cx + hit.cw / 2), cy: Math.round(hit.cy + hit.ch / 2) }
      : pt

    if (mode === 'text') {
      // text 模式：点击 OCR 框填入识别文字，无框则忽略
      if (hit) onPick([{ x: finalPt.dx, y: finalPt.dy }], hit.text)
      return
    }
    if (mode === 'single') {
      onPick([{ x: finalPt.dx, y: finalPt.dy }])
      return
    }
    if (!firstPoint) {
      setFirstPoint(finalPt)
      redraw(finalPt.cx, finalPt.cy, finalPt)
    } else {
      onPick([{ x: firstPoint.dx, y: firstPoint.dy }, { x: finalPt.dx, y: finalPt.dy }])
    }
  }

  const title = mode === 'text'
    ? (ocrBoxes.length > 0 ? '点击文字框填入识别文字' : '先点击「OCR 识别」，再点击文字框')
    : mode === 'single'
    ? '点击选择坐标'
    : firstPoint
      ? `点击终点（起点 ${firstPoint.dx}, ${firstPoint.dy}）`
      : '点击选择起点'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-4 gap-3">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm">{title}</DialogTitle>
            <button
              type="button"
              onClick={() => void runOcr(b64Ref)}
              disabled={ocrLoading || loading || empty}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors',
                'border border-border hover:bg-accent disabled:opacity-40',
                ocrBoxes.length > 0 && 'border-indigo-400/60 text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10',
              )}
            >
              {ocrLoading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <ScanText className="w-3 h-3" />
              }
              OCR 识别
            </button>
          </div>
        </DialogHeader>

        <div ref={containerRef} className="relative">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && empty && (
            <div className="flex flex-col items-center justify-center gap-2 h-40 text-muted-foreground">
              <Crosshair className="w-8 h-8 opacity-30" />
              <p className="text-xs">无法获取截图，请先连接设备</p>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={cn(
              'rounded-md border border-border block mx-auto cursor-crosshair max-w-full',
              loading && 'hidden',
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          />
          {hoverPos && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] px-2 py-0.5 rounded font-mono pointer-events-none">
              {hoverPos.x}, {hoverPos.y}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── 便捷按钮，自带弹窗状态管理 ────────────────────────────────────────────

interface PickButtonProps {
  mode: 'single' | 'dual'
  onPick: (points: Point[]) => void
}

export function PickButton({ mode, onPick }: PickButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        title={mode === 'single' ? '截图选点' : '截图选起终点'}
        className="nodrag shrink-0 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(true)}
      >
        <Crosshair className="w-3.5 h-3.5" />
      </button>
      {open && (
        <ScreenPicker
          mode={mode}
          onPick={(pts) => { onPick(pts); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ── OCR 文字选择按钮 ───────────────────────────────────────────────────────

interface OcrPickButtonProps {
  onPick: (text: string) => void
}

export function OcrPickButton({ onPick }: OcrPickButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        title="截图选择文字"
        className="nodrag shrink-0 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(true)}
      >
        <ScanText className="w-3.5 h-3.5" />
      </button>
      {open && (
        <ScreenPicker
          mode="text"
          onPick={(_, text) => { if (text) { onPick(text); setOpen(false) } }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
