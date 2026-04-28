import { Handle, Position } from "@xyflow/react"
import { CheckCircle2, Loader2, CircleDashed } from "lucide-react"

export function CustomNode({ data, selected }: any) {
  const Icon = data.icon

  return (
    <div className={`flex items-center gap-3 rounded-xl border-2 bg-card p-3 shadow-sm transition-colors min-w-[200px] ${selected ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        {Icon && <Icon className="size-5 text-primary" />}
      </div>
      <div className="flex-1 overflow-hidden">
        <h4 className="truncate text-sm font-medium">{data.label}</h4>
        <p className="truncate text-xs text-muted-foreground">{data.category}</p>
      </div>
      <div className="shrink-0">
        {data.status === "已配置" && <CheckCircle2 className="size-4 text-emerald-500" />}
        {data.status === "运行中" && <Loader2 className="size-4 text-primary animate-spin" />}
        {data.status === "待配置" && <CircleDashed className="size-4 text-muted-foreground" />}
      </div>
      
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !border-2 !border-background !bg-primary" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !border-2 !border-background !bg-primary" />
    </div>
  )
}
