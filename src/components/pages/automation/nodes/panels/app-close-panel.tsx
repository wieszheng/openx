import { Input } from "@/components/ui/input"
import type { AppCloseData } from "../types"

type Props = {
  node: { id: string; data: AppCloseData }
  onUpdate: (id: string, data: Partial<AppCloseData>) => void
}

export function AppClosePanel({ node, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input value={node.data.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">应用包名</p>
        <Input placeholder="如 com.example.app" value={node.data.packageName} onChange={(e) => onUpdate(node.id, { packageName: e.target.value })} className="h-8 text-sm" />
      </div>
    </div>
  )
}
