import { useState, useEffect, useRef } from 'react'
import { Loader2, Crosshair } from 'lucide-react'
import { useDevicesStore } from '@/stores/devices'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Point { x: number; y: number }

interface ScreenPickerProps {
  mode: 'single' | 'dual'
  onPick: (points: Point[]) => void
  onClose: () => void
}

export function ScreenPicker({ mode, onPick, onClose }: ScreenPickerProps) {
  const selectedId = useDevicesStore((s) => s.selectedId)
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoverPos, setHoverPos] = useState<Point | null>(null)
  const [firstPoint, setFirstPoint] = useState<Point | null>(null)
  const [firstPct, setFirstPct] = useState<{ x: number; y: number } | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!selectedId) { setLoading(false); return }
    window.api.screencap.capture(selectedId).then((res) => {
      if (res.ok) setImgSrc(`data:${res.mimeType};base64,${res.data}`)
      setLoading(false)
    })
  }, [selectedId])

  function getCoords(e: React.MouseEvent<HTMLImageElement>) {
    const img = imgRef.current!
    const rect = img.getBoundingClientRect()
    const pctX = (e.clientX - rect.left) / rect.width
    const pctY = (e.clientY - rect.top) / rect.height
    return {
      x: Math.round(pctX * img.naturalWidth),
      y: Math.round(pctY * img.naturalHeight),
      pctX,
      pctY,
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLImageElement>) {
    const { x, y } = getCoords(e)
    setHoverPos({ x, y })
  }

  function handleClick(e: React.MouseEvent<HTMLImageElement>) {
    const { x, y, pctX, pctY } = getCoords(e)
    if (mode === 'single') {
      onPick([{ x, y }])
      return
    }
    if (!firstPoint) {
      setFirstPoint({ x, y })
      setFirstPct({ x: pctX * 100, y: pctY * 100 })
    } else {
      onPick([firstPoint, { x, y }])
    }
  }

  const title = mode === 'single'
    ? '点击选择坐标'
    : firstPoint
      ? `点击终点（起点 ${firstPoint.x}, ${firstPoint.y}）`
      : '点击选择起点'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-4 gap-3">
        <DialogHeader>
          <DialogTitle className="text-sm">{title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : imgSrc ? (
          <div className="relative rounded-md overflow-hidden border border-border select-none">
            <img
              ref={imgRef}
              src={imgSrc}
              alt="device screenshot"
              className="w-full object-contain cursor-crosshair max-h-[60vh] block"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverPos(null)}
              onClick={handleClick}
              draggable={false}
            />

            {/* 起点标记（双点模式） */}
            {firstPct && (
              <div
                className="absolute pointer-events-none"
                style={{ left: `${firstPct.x}%`, top: `${firstPct.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-3 h-3 rounded-full bg-indigo-500 ring-2 ring-white shadow" />
                <span className="absolute left-4 -top-0.5 text-[10px] bg-indigo-500 text-white px-1 rounded whitespace-nowrap">
                  起点
                </span>
              </div>
            )}

            {/* 悬停坐标 */}
            {hoverPos && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] px-2 py-0.5 rounded font-mono pointer-events-none">
                {hoverPos.x}, {hoverPos.y}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 h-40 text-muted-foreground">
            <Crosshair className="w-8 h-8 opacity-30" />
            <p className="text-xs">无法获取截图，请先连接设备</p>
          </div>
        )}
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
