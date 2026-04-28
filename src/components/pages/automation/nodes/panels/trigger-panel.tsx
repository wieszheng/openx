import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function TriggerPanel({ node, onUpdate }: { node: any; onUpdate: (id: string, data: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">触发器名称</p>
        <Input
          value={node.data.label ?? ""}
          onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Webhook URL (系统生成)</p>
        <div className="flex gap-2">
          <Input
            value="https://api.openx.com/hook/v1/trigger/a1b2c3d4"
            readOnly
            className="h-8 text-sm text-muted-foreground"
          />
          <Button size="sm" className="h-8" variant="outline">复制</Button>
        </div>
      </div>
    </div>
  )
}
