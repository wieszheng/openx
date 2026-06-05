import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Crosshair } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDevicesStore } from '@/stores/devices'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Point { x: number; y: number }
interface CanvasPoint { dx: number; dy: number; cx: number; cy: number }

interface ScreenPickerProps {
  mode: 'single' | 'dual'
  onPick: (points: Point[]) => void
  onClose: () => void
}

export function ScreenPicker({ mode, onPick, onClose }: ScreenPickerProps) {
  const selectedId = useDevicesStore((s) => s.selectedId)
  const [loading, setLoading] = useState(true)
  const [empty, setEmpty] = useState(false)
  const [hoverPos, setHoverPos] = useState<Point | null>(null)
  const [firstPoint, setFirstPoint] = useState<CanvasPoint | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgElRef = useRef<HTMLImageElement | null>(null)
  const scaleRef = useRef(1)

  // ── 绘制函数 ────────────────────────────────────────────────────────────
  const redraw = useCallback((
    mx?: number, my?: number,
    fp?: CanvasPoint | null,
  ) => {
    const canvas = canvasRef.current
    const img = imgElRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')!
    const { width: w, height: h } = canvas

    // 1. 底图
    ctx.drawImage(img, 0, 0, w, h)

    // 2. 十字准线
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

    // 3. 起点标记 + 连线（双点模式）
    if (fp) {
      // 连线到当前鼠标
      if (mx !== undefined && my !== undefined) {
        ctx.save()
        ctx.strokeStyle = 'rgba(99,102,241,0.65)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 3])
        ctx.beginPath()
        ctx.moveTo(fp.cx, fp.cy)
        ctx.lineTo(mx, my)
        ctx.stroke()
        ctx.restore()
      }
      // 圆点
      ctx.save()
      ctx.fillStyle = 'rgba(99,102,241,0.3)'
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(fp.cx, fp.cy, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      // 标签
      ctx.save()
      ctx.font = 'bold 11px ui-monospace, monospace'
      const label = `起 ${fp.dx},${fp.dy}`
      const tw = ctx.measureText(label).width
      const lx = fp.cx + 10, ly = fp.cy - 8
      ctx.fillStyle = 'rgba(99,102,241,0.85)'
      ctx.beginPath()
      ctx.roundRect(lx - 3, ly - 11, tw + 6, 16, 3)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(label, lx, ly)
      ctx.restore()
    }
  }, [])

  // ── 加载截图 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) { setEmpty(true); setLoading(false); return }
    window.api.screencap.capture(selectedId).then((res) => {
      if (!res.ok) { setEmpty(true); setLoading(false); return }
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const maxW = containerRef.current?.clientWidth ?? 340
        const maxH = Math.floor(window.innerHeight * 0.62)
        const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight)
        scaleRef.current = scale
        canvas.width = Math.round(img.naturalWidth * scale)
        canvas.height = Math.round(img.naturalHeight * scale)
        imgElRef.current = img
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setLoading(false)
      }
      img.src = `data:${res.mimeType};base64,${res.data}`
    })
  }, [selectedId])

  // ── 坐标换算 ─────────────────────────────────────────────────────────────
  function getCoords(e: React.MouseEvent<HTMLCanvasElement>): CanvasPoint {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    // canvas CSS 尺寸可能被 max-w 压缩，需再乘以比例
    const cx = Math.round((e.clientX - rect.left) * (canvas.width / rect.width))
    const cy = Math.round((e.clientY - rect.top) * (canvas.height / rect.height))
    const s = scaleRef.current
    return { dx: Math.round(cx / s), dy: Math.round(cy / s), cx, cy }
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
    if (mode === 'single') {
      onPick([{ x: pt.dx, y: pt.dy }])
      return
    }
    if (!firstPoint) {
      setFirstPoint(pt)
      redraw(pt.cx, pt.cy, pt)
    } else {
      onPick([{ x: firstPoint.dx, y: firstPoint.dy }, { x: pt.dx, y: pt.dy }])
    }
  }

  const title = mode === 'single'
    ? '点击选择坐标'
    : firstPoint
      ? `点击终点（起点 ${firstPoint.dx}, ${firstPoint.dy}）`
      : '点击选择起点'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-4 gap-3">
        <DialogHeader>
          <DialogTitle className="text-sm">{title}</DialogTitle>
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
