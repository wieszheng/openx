import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { ApiHttpData, HttpMethod } from "../types"

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:    "text-emerald-500",
  POST:   "text-blue-500",
  PUT:    "text-amber-500",
  DELETE: "text-red-500",
  PATCH:  "text-violet-500",
}

type Props = {
  node: { id: string; data: ApiHttpData }
  onUpdate: (id: string, data: Partial<ApiHttpData>) => void
}

export function ApiHttpPanel({ node, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input value={node.data.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">请求方法</p>
        <Select value={node.data.method} onValueChange={(v) => onUpdate(node.id, { method: v as HttpMethod })}>
          <SelectTrigger className={cn("h-8 text-sm font-semibold font-mono", METHOD_COLORS[node.data.method])}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["GET", "POST", "PUT", "DELETE", "PATCH"] as HttpMethod[]).map((m) => (
              <SelectItem key={m} value={m} className={cn("font-mono font-semibold text-sm", METHOD_COLORS[m])}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">请求 URL</p>
        <Input placeholder="https://api.example.com/endpoint" value={node.data.url} onChange={(e) => onUpdate(node.id, { url: e.target.value })} className="h-8 text-sm" />
      </div>
    </div>
  )
}
