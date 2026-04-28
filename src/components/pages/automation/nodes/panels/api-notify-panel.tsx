import { Input } from "@/components/ui/input"
import type { ApiNotifyData } from "../types"

type Props = {
  node: { id: string; data: ApiNotifyData }
  onUpdate: (id: string, data: Partial<ApiNotifyData>) => void
}

export function ApiNotifyPanel({ node, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input value={node.data.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Webhook URL</p>
        <Input placeholder="https://hooks.example.com/notify" value={node.data.url} onChange={(e) => onUpdate(node.id, { url: e.target.value })} className="h-8 text-sm" />
      </div>
    </div>
  )
}
