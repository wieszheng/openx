import { Handle, Position, useReactFlow } from "@xyflow/react"
import { CheckCircle2, CircleDashed, Loader2, Play, Trash2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  NODE_KIND_TO_CATEGORY,
  type NodeKind,
  type NodeStatus,
} from "./types"

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

// ─── BaseNode ─────────────────────────────────────────────
type BaseNodeProps = {
  id: string
  label: string
  status: NodeStatus
  nodeKind: NodeKind
  icon: React.ComponentType<{ className?: string }>
  selected?: boolean
  children?: React.ReactNode
}

export function BaseNode({ id, label, status, nodeKind, icon: Icon, selected, children }: BaseNodeProps) {
  const category = NODE_KIND_TO_CATEGORY[nodeKind]
  const style = CATEGORY_STYLES[category]
  const categoryLabel = CATEGORY_LABELS[category]
  const { deleteElements } = useReactFlow()

  // ── 外层边框容器样式 ────────────────────────────────────
  // 统一用 p-[2px] + overflow-hidden，背景色即边框色
  const outerCls = cn(
    "group/node relative overflow-hidden rounded-lg p-[1px] transition-all duration-300 max-w-72",
    // 运行中：由流光动画层提供颜色，外层加发光
    status === "运行中" && `${style.glow}`,
    // 已配置：分类色实体边框 + 分类色外发光（稍弱）
    status === "已配置" && `${style.solidBg} ${style.configuredShadow}`,
    // 待配置 + 未选中：细灰边框
    status === "待配置" && !selected && "bg-border/60",
    // 待配置 + 选中：分类色边框 + 强发光
    status === "待配置" && selected && `${style.solidBg} ${style.glow}`,
  )

  return (
    <div className="group/node relative">

      {/* ── 边框容器 ── */}
      <div className={outerCls}>

        {/* 流光动画层（仅运行中状态）*/}
        {status === "运行中" && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
            <div
              className="absolute left-1/2 top-1/2 aspect-square w-[250%] -translate-x-1/2 -translate-y-1/2 animate-[spin_3s_linear_infinite]"
              style={{
                background: `conic-gradient(from 0deg, transparent 0%, transparent 30%, ${style.beamColor.split(",")[0]} 45%, ${style.beamColor.split(",")[1].trim()} 55%, ${style.beamColor.split(",")[0]} 65%, transparent 75%)`,
              }}
            />
          </div>
        )}

        {/* ── 卡片主体 ── */}
        <div className={cn(
          "relative rounded-lg bg-card",
          status !== "运行中" && "shadow-sm",
        )}>
          {/* 节点头部 */}
          <div className="flex items-center gap-2.5 p-3">
            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", style.iconBg)}>
              <Icon className={cn("size-4", style.iconText)} />
            </div>

            <div className="flex-1 overflow-hidden">
              <h4 className="truncate text-sm font-medium leading-none">{label}</h4>
              <p className={cn("mt-0.5 truncate text-xs", style.labelText)}>{categoryLabel}</p>
            </div>

            {/* 右侧区：固定宽度，状态图标 ↔ 操作按钮互相淡入淡出 */}
            {/* w-[52px] = 两个 size-6 按钮(24px×2) + gap-0.5(2px) + 余量，始终占位，标题不会被覆盖 */}
            <div className="nodrag nopan relative shrink-0 w-[52px] flex items-center justify-end">
              {/* 状态图标：绝对定位，hover 时淡出 */}
              <div className="absolute right-0 transition-opacity duration-150 group-hover/node:opacity-0 pointer-events-none">
                {status === "已配置" && <CheckCircle2 className={cn("size-4", style.statusText)} />}
                {status === "运行中" && <Loader2 className={cn("size-4 animate-spin", style.statusText)} />}
                {status === "待配置" && <CircleDashed className="size-4 text-muted-foreground/40" />}
              </div>
              {/* 操作按钮：hover 时淡入 */}
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/node:opacity-100">
                <button
                  type="button"
                  title="执行此节点"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md transition-colors",
                    "text-muted-foreground/60 hover:text-emerald-600 hover:bg-emerald-500/10",
                  )}
                >
                  <Play className="size-3.5 fill-current" />
                </button>
                <button
                  type="button"
                  title="删除节点"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteElements({ nodes: [{ id }] })
                  }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md transition-colors",
                    "text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10",
                  )}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 内联字段区 */}
          {children && (
            <>
              <Separator />
              <div className="flex flex-col gap-2 px-3 py-2">
                {children}
              </div>
            </>
          )}
        </div>
      </div>

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
