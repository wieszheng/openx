import { useState, useEffect, useCallback, useRef } from 'react'
import {
  RefreshCw,
  Loader2,
  Search,
  X,
  Copy,
  Play,
  Pause,
  ScrollText,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const LINE_RE = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\] \[(\w+)\]\s+(?:\[([^\]]+)\] )?(.*)$/

type LogLevel = 'debug' | 'verbose' | 'info' | 'warn' | 'error' | 'unknown'

interface LogEntry {
  id: number
  timestamp: string
  level: LogLevel
  scope: string
  message: string
  raw: string
}

const ALL_LEVELS: LogLevel[] = ['debug', 'verbose', 'info', 'warn', 'error']

const LEVEL_ORDER: Record<LogLevel | 'all', number> = {
  all: 0, debug: 1, verbose: 2, info: 3, warn: 4, error: 5, unknown: 0,
}

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug:   'text-muted-foreground',
  verbose: 'text-muted-foreground',
  info:    'text-foreground',
  warn:    'text-amber-500',
  error:   'text-destructive',
  unknown: 'text-muted-foreground',
}

const BADGE_STYLES: Record<LogLevel, string> = {
  debug:   'bg-muted text-muted-foreground',
  verbose: 'bg-muted text-muted-foreground',
  info:    'bg-blue-500/10 text-blue-500',
  warn:    'bg-amber-500/10 text-amber-500',
  error:   'bg-destructive/10 text-destructive',
  unknown: 'bg-muted text-muted-foreground',
}

const FILTER_LEVELS: (LogLevel | 'all')[] = ['all', 'debug', 'info', 'warn', 'error']

function parseLine(raw: string, id: number): LogEntry {
  const m = raw.match(LINE_RE)
  if (!m) return { id, raw, timestamp: '', level: 'unknown', scope: '', message: raw }
  const level = (ALL_LEVELS.includes(m[2] as LogLevel) ? m[2] : 'unknown') as LogLevel
  return { id, raw, timestamp: m[1], level, scope: m[3] ?? '', message: m[4] }
}

function parseContent(content: string): LogEntry[] {
  let id = 0
  return content.split('\n').filter((l) => l.trim()).map((raw) => parseLine(raw, id++))
}

function LogViewerContent(): React.JSX.Element {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [logPath, setLogPath] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadLog = useCallback(async () => {
    setLoading(true)
    try {
      const content = await window.api.log.read()
      setEntries(parseContent(content))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLog()
    window.api.log.getPath().then(setLogPath).catch(() => {})
  }, [loadLog])

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => void loadLog(), 3000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [autoRefresh, loadLog])

  useEffect(() => {
    if (autoRefresh) bottomRef.current?.scrollIntoView()
  }, [entries, autoRefresh])

  const filtered = entries.filter((e) => {
    if (levelFilter !== 'all' && LEVEL_ORDER[e.level] < LEVEL_ORDER[levelFilter]) return false
    return !search || e.raw.toLowerCase().includes(search.toLowerCase())
  })

  const handleCopy = () => {
    void navigator.clipboard.writeText(filtered.map((e) => e.raw).join('\n'))
      .then(() => toast.success('已复制到剪贴板'))
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <div className="flex items-center border rounded-lg overflow-hidden shrink-0">
          {FILTER_LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => setLevelFilter(lv)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent ${
                levelFilter === lv ? 'bg-accent text-foreground' : 'text-muted-foreground'
              }`}
            >
              {lv === 'all' ? '全部' : lv.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-32">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="h-8 pl-8 pr-8 text-sm"
            placeholder="过滤日志…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch('')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setAutoRefresh((v) => !v)}
            >
              {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{autoRefresh ? '停止自动刷新' : '自动刷新 (3s)'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => void loadLog()} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>刷新</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
              <Copy className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>复制过滤后日志</TooltipContent>
        </Tooltip>
      </div>

      {/* Log area */}
      <div className="flex-1 rounded-lg border bg-card overflow-hidden font-mono min-h-0">
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">加载中…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            {entries.length === 0 ? '暂无日志' : '无匹配结果'}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-px text-xs">
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-start gap-2 px-2 py-0.5 rounded hover:bg-muted/50 transition-colors ${LEVEL_STYLES[entry.level]}`}
                >
                  <span className="shrink-0 text-muted-foreground tabular-nums select-none w-[148px]">
                    {entry.timestamp}
                  </span>
                  <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-px rounded uppercase w-14 text-center ${BADGE_STYLES[entry.level]}`}>
                    {entry.level === 'unknown' ? '?' : entry.level}
                  </span>
                  {entry.scope && (
                    <span className="shrink-0 text-muted-foreground/70 max-w-[100px] truncate">
                      [{entry.scope}]
                    </span>
                  )}
                  <span className="flex-1 break-all whitespace-pre-wrap min-w-0">
                    {entry.message || entry.raw}
                  </span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <span>
          {filtered.length !== entries.length
            ? `${filtered.length} / ${entries.length} 条`
            : `${entries.length} 条`}
          {autoRefresh && <span className="ml-2 text-primary">● 自动刷新中</span>}
        </span>
        {logPath && <span className="truncate max-w-xs opacity-60">{logPath}</span>}
      </div>
    </div>
  )
}

export function LogViewerDialog(): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <button
              className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
              title="日志查看"
            >
              <ScrollText className="w-5 h-5" />
            </button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">日志查看</TooltipContent>
      </Tooltip>
      <DialogContent className="min-w-2xl h-[75vh]">
        <DialogHeader>
          <DialogTitle>日志查看器</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {open && <LogViewerContent />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
