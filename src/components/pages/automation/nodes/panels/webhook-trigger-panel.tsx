import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { WebhookTriggerData } from "../types"

type Props = {
  node: { id: string; data: WebhookTriggerData }
  onUpdate: (id: string, data: Partial<WebhookTriggerData>) => void
}

export function WebhookTriggerPanel({ node, onUpdate }: Props) {
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
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Webhook URL（系统生成）</p>
        <div className="flex gap-2">
          <Input
            value={node.data.webhookUrl || "https://api.openx.com/hook/v1/trigger/a1b2c3d4"}
            readOnly
            className="h-8 text-sm text-muted-foreground"
          />
          <Button size="sm" className="h-8 shrink-0" variant="outline">复制</Button>
        </div>
      </div>
    </div>
  )
}
