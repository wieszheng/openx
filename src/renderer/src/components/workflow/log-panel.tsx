import { useEffect, useRef } from 'react'
import { useWorkflowStore } from '@/stores/workflow'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { ExecutionLog } from '../../../../shared/workflow'

const STATUS_COLORS: Record<string, string> = {
  running: 'text-emerald-500',
  success: 'text-emerald-400',
  error:   'text-red-500',
  skipped: 'text-muted-foreground',
  pending: 'text-muted-foreground',
}

const STATUS_ICONS: Record<string, string> = {
  running: '⟳',
  success: '✓',
  error:   '✗',
  skipped: '—',
  pending: '○',
}

function LogRow({ log }: { log: ExecutionLog }) {
  return (
    <div className="flex gap-2 items-start py-1 border-b border-border/40 last:border-0 text-[11px]">
      <span className={cn('font-bold shrink-0 mt-0.5 w-4 text-center', STATUS_COLORS[log.status])}>
        {STATUS_ICONS[log.status]}
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-foreground">{log.nodeLabel}</span>
        {log.output && (
          <p className="text-muted-foreground font-mono break-all leading-relaxed mt-0.5">{log.output}</p>
        )}
      </div>
      {log.duration !== undefined && (
        <span className="text-muted-foreground shrink-0">{log.duration}ms</span>
      )}
    </div>
  )
}

export function LogPanel({ height = 180 }: { height?: number }) {
  const { logs, runStatus, clearLogs } = useWorkflowStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div
      className="flex flex-col border-t border-border bg-card shrink-0"
      style={{ height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">执行日志</h4>
          {runStatus === 'running' && (
            <span className="text-[10px] text-emerald-500 font-bold animate-pulse">● 运行中</span>
          )}
          {runStatus === 'done' && (
            <span className="text-[10px] text-emerald-500 font-bold">✓ 完成</span>
          )}
          {runStatus === 'error' && (
            <span className="text-[10px] text-red-500 font-bold">✗ 错误</span>
          )}
          {runStatus === 'stopped' && (
            <span className="text-[10px] text-yellow-500 font-bold">⏹ 已停止</span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={clearLogs}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        {logs.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2">暂无日志，点击「运行」开始执行工作流</p>
        ) : (
          logs.map((log) => <LogRow key={log.id} log={log} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
