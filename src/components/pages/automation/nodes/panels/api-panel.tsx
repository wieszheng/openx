import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ApiNodeData } from "../types"

type Props = {
  node: { id: string; data: ApiNodeData }
  onUpdate: (id: string, data: Partial<ApiNodeData>) => void
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const

export function ApiPanel({ node, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input
          value={node.data.label}
          onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          className="h-8 text-sm"
        />
      </div>

      {node.data.action === "http" && (
        <>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">请求方式</p>
            <Select
              value={node.data.method}
              onValueChange={(v) => onUpdate(node.id, { method: v as ApiNodeData["method"] })}
            >
              <SelectTrigger className="w-full h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">请求 URL</p>
            <Input
              value={node.data.url}
              onChange={(e) => onUpdate(node.id, { url: e.target.value })}
              placeholder="https://api.example.com/endpoint"
              className="h-8 text-sm"
            />
          </div>
        </>
      )}

      {node.data.action === "notify" && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">通知 Webhook URL</p>
          <Input
            value={node.data.url}
            onChange={(e) => onUpdate(node.id, { url: e.target.value })}
            placeholder="https://hooks.example.com/notify"
            className="h-8 text-sm"
          />
        </div>
      )}
    </div>
  )
}
