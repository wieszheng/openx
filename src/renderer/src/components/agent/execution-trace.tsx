import { useAgentStore } from '@/stores/agent'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react'
import type { Checkpoint } from '../../../../shared/agent'

function TraceItem({
  cp,
  isSelected,
  isActive,
  onSelect,
}: {
  cp: Checkpoint
  isSelected: boolean
  isActive: boolean
  onSelect: () => void
}) {
  const mime = cp.screenshotMime ?? 'image/png'
  const imgSrc = cp.screenshotBase64
    ? `data:${mime};base64,${cp.screenshotBase64}`
    : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg border p-2 transition-colors',
        isSelected ? 'border-primary/50 bg-primary/5' : 'border-border/50 hover:bg-accent/50',
        isActive && 'ring-1 ring-blue-500/40'
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {isActive ? (
          <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
        ) : cp.ok ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
        )}
        <span className="text-xs font-medium truncate flex-1">{cp.nodeLabel}</span>
        {cp.duration != null && (
          <span className="text-[10px] text-muted-foreground shrink-0">{cp.duration}ms</span>
        )}
      </div>

      {imgSrc && (
        <div className="rounded-md overflow-hidden border border-border/40 bg-muted/20 mb-1.5">
          <img src={imgSrc} alt={cp.nodeLabel} className="w-full object-contain max-h-24 block" />
        </div>
      )}

      {cp.output && (
        <p className="text-[10px] text-muted-foreground font-mono line-clamp-2 leading-relaxed">
          {cp.output}
        </p>
      )}

      {cp.ocrItems && cp.ocrItems.length > 0 && (
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          OCR {cp.ocrItems.length} 项
        </p>
      )}
    </button>
  )
}

export function ExecutionTrace() {
  const { checkpoints, selectedCheckpointId, status, selectCheckpoint, assertionResults } = useAgentStore()

  const selected = checkpoints.find((c) => c.nodeId === selectedCheckpointId)
  const selectedAssertions = selectedCheckpointId ? assertionResults[selectedCheckpointId] : undefined

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-3 py-2 border-b shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">执行轨迹</span>
          <span className="text-[10px] text-muted-foreground">{checkpoints.length} 步</span>
        </div>
        {status === 'running' && (
          <span className="text-[10px] text-blue-500 font-medium">● 执行中</span>
        )}
        {status === 'paused' && (
          <span className="text-[10px] text-amber-500 font-medium">⏸ 已暂停</span>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-2">
          {checkpoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <Circle className="w-8 h-8 opacity-30" />
              <p className="text-xs text-center px-4">
                启动 Agent 调试后，每步将自动截图并记录 OCR 结果
              </p>
            </div>
          ) : (
            checkpoints.map((cp, i) => (
              <TraceItem
                key={`${cp.nodeId}-${cp.timestamp}`}
                cp={cp}
                isSelected={selectedCheckpointId === cp.nodeId}
                isActive={status === 'running' && i === checkpoints.length - 1}
                onSelect={() => selectCheckpoint(cp.nodeId)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {selectedAssertions && selectedAssertions.length > 0 && (
        <div className="border-t p-2 max-h-24 overflow-y-auto shrink-0">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">断言结果</p>
          <div className="space-y-1">
            {selectedAssertions.map((r, i) => (
              <div key={i} className="flex items-start gap-1 text-[10px]">
                {r.ok ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className={r.ok ? 'text-emerald-600' : 'text-red-600'}>{r.expected}</p>
                  {!r.ok && <p className="text-muted-foreground truncate">实际: {r.actual}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected?.ocrItems && selected.ocrItems.length > 0 && (
        <div className="border-t p-2 max-h-28 overflow-y-auto shrink-0">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">OCR 识别</p>
          <div className="flex flex-wrap gap-1">
            {selected.ocrItems.slice(0, 20).map((item, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border/50"
              >
                {item.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
