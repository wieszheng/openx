import type { NodeProps, Node } from "@xyflow/react"
import { Activity } from "lucide-react"
import { BaseNode } from "../base-node"
import { cn } from "@/lib/utils"
import type { ApiHttpData, HttpMethod } from "../types"

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:    "text-emerald-500",
  POST:   "text-blue-500",
  PUT:    "text-amber-500",
  DELETE: "text-red-500",
  PATCH:  "text-violet-500",
}

export function ApiHttpNode({ id, data, selected }: NodeProps<Node<ApiHttpData>>) {
  return (
    <BaseNode id={id} label={data.label} status={data.status} nodeKind="apiHttp" icon={Activity} selected={selected}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none bg-muted text-muted-foreground/70">
          方法
        </span>
        <span className={cn("shrink-0 text-[11px] font-mono font-semibold leading-none", METHOD_COLORS[data.method])}>
          {data.method}
        </span>
        <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none bg-muted text-muted-foreground/70">
          URL
        </span>
        <span className={cn("truncate text-[11px] font-mono leading-none", data.url ? "text-foreground/75" : "text-muted-foreground/40 italic")}>
          {data.url || "未配置"}
        </span>
      </div>
    </BaseNode>
  )
}
