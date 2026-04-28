import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

export function DefaultPanel({ node, onUpdate }: { node: any; onUpdate: (id: string, data: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点类型</p>
        <Input
          value={node.data.category ?? ""}
          readOnly
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input
          value={node.data.label ?? ""}
          onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-2 mt-4">
        <div className="flex items-center justify-between rounded-lg border p-2.5">
          <span className="text-sm">失败重试</span>
          <Switch defaultChecked />
        </div>
      </div>
    </div>
  )
}
