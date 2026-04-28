import { Handle, Position } from "@xyflow/react"
import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  NODE_KIND_TO_CATEGORY,
  type NodeKind,
  type NodeStatus,
} from "./types"

type BaseNodeProps = {
  label: string
  status: NodeStatus
  nodeKind: NodeKind
  icon: React.ComponentType<{ className?: string }>
  selected?: boolean
  children?: React.ReactNode
}

// ─── 公用字段行 ───────────────────────────────────────────
export function NodeField({
  label,
  value,
  mono = false,
  empty = "未配置",
  icon: Icon,
  badge,
}: {
  label: string
  value?: string | number
  mono?: boolean
  empty?: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string
}) {
  const isEmpty = value === undefined || value === "" || value === 0
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none bg-muted text-muted-foreground/70">
        {label}
      </span>
      {Icon && (
        <span className={cn("shrink-0", badge ?? "text-muted-foreground/70")}>
          <Icon className="size-3" />
        </span>
      )}
      <span
        className={cn(
          "truncate text-[11px] leading-none",
          mono && "font-mono",
          badge ?? (isEmpty ? "text-muted-foreground/40 italic" : "text-foreground/75")
        )}
      >
        {isEmpty ? empty : String(value)}
      </span>
    </div>
  )
}

export function BaseNode({ label, status, nodeKind, icon: Icon, selected, children }: BaseNodeProps) {
  const category = NODE_KIND_TO_CATEGORY[nodeKind]
  const style = CATEGORY_STYLES[category]
  const categoryLabel = CATEGORY_LABELS[category]

  return (
    <div
      className={cn(
        "rounded-xl border-2 bg-card shadow-sm transition-colors min-w-[220px] max-w-[280px]",
        selected ? `${style.border} ring-1 ring-current/10` : "border-border"
      )}
    >
      {/* 节点头部 */}
      <div className="flex items-center gap-3 p-3">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", style.iconBg)}>
          <Icon className={cn("size-4", style.iconText)} />
        </div>

        <div className="flex-1 overflow-hidden">
          <h4 className="truncate text-sm font-medium leading-none">{label}</h4>
          <p className={cn("mt-0.5 truncate text-xs", style.labelText)}>{categoryLabel}</p>
        </div>

        <div className="shrink-0">
          {status === "已配置" && <CheckCircle2 className="size-4 text-emerald-500" />}
          {status === "运行中" && <Loader2 className="size-4 text-primary animate-spin" />}
          {status === "待配置" && <CircleDashed className="size-4 text-muted-foreground" />}
        </div>
      </div>

      {/* 内联配置区 */}
      {children && (
        <>
          <Separator />
          <div className="flex flex-col gap-1.5 px-3 py-2">
            {children}
          </div>
        </>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className={cn("!w-3 !h-3 !border-2 !border-background", style.handle)}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn("!w-3 !h-3 !border-2 !border-background", style.handle)}
      />
    </div>
  )
}
