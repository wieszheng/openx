import { useEffect, useRef } from 'react'
import { useAgentStore } from '@/stores/agent'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Brain, Loader2 } from 'lucide-react'

export function PlanThinkLog() {
  const { planning, planThinkLogs, planStreamText } = useAgentStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [planThinkLogs, planStreamText])

  const hasContent = planning || planThinkLogs.length > 0 || planStreamText.length > 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-3 py-1.5 border-b flex items-center gap-1.5 shrink-0">
        {planning ? (
          <Loader2 className="w-3 h-3 text-violet-500 animate-spin" />
        ) : (
          <Brain className="w-3 h-3 text-violet-500" />
        )}
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          思考过程
        </span>
        {planning && (
          <span className="text-[10px] text-violet-500 ml-auto">生成中…</span>
        )}
      </div>

      {!hasContent ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground px-4">
          <p className="text-xs text-center">编排开始后，意图分析、节点选型、参数摘要将在此显示</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-3 py-2 space-y-1">
            {planThinkLogs.map((line, i) => (
              <p
                key={i}
                className={cn(
                  'text-[11px] font-mono leading-relaxed break-all',
                  line.startsWith('✓') && 'text-emerald-600',
                  line.startsWith('✗') && 'text-red-500',
                  line.startsWith('⚠') && 'text-amber-600',
                  line.startsWith('▶') && 'text-violet-600 font-medium',
                  line.startsWith('◆') && 'text-foreground/80',
                  line.startsWith('  ') && 'text-muted-foreground pl-1',
                  !line.match(/^[✓✗⚠▶◆]/) && !line.startsWith('  ') && 'text-muted-foreground'
                )}
              >
                {line}
              </p>
            ))}

            {planStreamText && (
              <pre className="text-[10px] font-mono text-emerald-600/80 dark:text-emerald-400/80 whitespace-pre-wrap break-all leading-relaxed bg-muted/30 rounded p-2 border border-border/40 mt-2">
                {planStreamText}
              </pre>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
