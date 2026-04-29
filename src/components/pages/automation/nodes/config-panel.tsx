import { useState } from "react"
import {
  X, Trash2, Zap,
  AlertCircle, Settings2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { configPanelRegistry } from "./node-registry"
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  NODE_KIND_TO_CATEGORY,
  type NodeKind,
  type AnyNodeData,
} from "./types"

// ─── Mock 执行日志 ─────────────────────────────────────────
const MOCK_LOGS: { time: string; level: "info" | "success" | "error"; msg: string }[] = [
  { time: "22:16:28", level: "info",    msg: "开始执行节点" },
  { time: "22:16:30", level: "success", msg: "执行成功，状态码 200" },
  { time: "22:16:31", level: "info",    msg: "响应耗时 1.2s" },
  { time: "22:16:33", level: "success", msg: "数据验证通过" },
]

const LOG_STYLES = {
  info:    { dot: "bg-blue-500",    text: "text-muted-foreground" },
  success: { dot: "bg-emerald-500", text: "text-foreground/80" },
  error:   { dot: "bg-red-500",     text: "text-red-500" },
}

type Tab = "config" | "logs"

type ConfigPanelProps = {
  node: { id: string; type: string; data: AnyNodeData } | null
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
  onUpdate: (id: string, data: Partial<AnyNodeData>) => void
}

export function ConfigPanel({ node, isOpen, onClose, onDelete, onUpdate }: ConfigPanelProps) {
  const [tab, setTab] = useState<Tab>("config")

  const PanelContent = node?.type
    ? configPanelRegistry[node.type as NodeKind]
    : null

  const category    = node ? NODE_KIND_TO_CATEGORY[node.type as NodeKind] : null
  const style       = category ? CATEGORY_STYLES[category] : null
  const categoryLabel = category ? CATEGORY_LABELS[category] : ""

  return (
    <div
      className={cn(
        "absolute right-0 top-0 h-full z-20 w-[300px] transition-all duration-300 flex flex-col",
        isOpen && node
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0 pointer-events-none",
      )}
    >
      {/* 侧边面板主体 */}
      <div className="flex flex-col h-full border-l bg-background/98 backdrop-blur-sm shadow-sm rounded-l-md">

        {/* ── 顶部标题栏 ── */}
        <div className={cn(
          "shrink-0 flex items-center gap-3 px-4 py-3 ",
        )}>
          {/* 分类色标 */}
          <div className="flex shrink-0 items-center justify-center rounded-lg">
            <Settings2 className="size-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none truncate">
              设置
            </p>
            {categoryLabel && (
              <p className={cn("mt-1 text-xs leading-none", style?.labelText ?? "text-muted-foreground")}>
                {categoryLabel}
              </p>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={onDelete}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">删除节点</TooltipContent>
            </Tooltip>
            <Button
              size="icon-xs"
              variant="ghost"
              className="size-7 text-muted-foreground"
              onClick={onClose}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Tab 切换 ── */}
        <div className="shrink-0 flex border-b">
          {(["config", "logs"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 text-xs font-medium transition-colors border-b-2",
                tab === t
                  ? cn("text-foreground", style ? style.iconText : "border-primary")
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
              style={tab === t ? { borderColor: "currentColor" } : undefined}
            >
              {t === "config" ? "节点配置" : "执行日志"}
            </button>
          ))}
        </div>

        {/* ── 内容区 ── */}
        <ScrollArea className="flex-1 min-h-0">
          {tab === "config" ? (
            <div className="p-4">
              {PanelContent && node ? (
                <PanelContent node={node} onUpdate={onUpdate} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <AlertCircle className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">未选中节点</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* 日志列表 */}
              <div className="space-y-0.5">
                {MOCK_LOGS.map((log, i) => {
                  const ls = LOG_STYLES[log.level]
                  return (
                    <div key={i} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
                      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", ls.dot)} />
                      <span className="shrink-0 text-[10px] font-mono text-muted-foreground/60">{log.time}</span>
                      <span className={cn("text-xs leading-relaxed", ls.text)}>{log.msg}</span>
                    </div>
                  )
                })}
              </div>

              <Separator />

              {/* 最近一次执行摘要 */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">最近执行</p>
                {[
                  { label: "开始时间", value: "22:16:28" },
                  { label: "结束时间", value: "22:16:33" },
                  { label: "执行结果", value: "成功", cls: "text-emerald-600 font-medium" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={cls}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
