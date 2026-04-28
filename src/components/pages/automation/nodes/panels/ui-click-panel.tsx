import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { UIClickData } from "../types"

type Props = {
  node: { id: string; data: UIClickData }
  onUpdate: (id: string, data: Partial<UIClickData>) => void
}

export function UIClickPanel({ node, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input value={node.data.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">元素选择器</p>
        <Input placeholder="XPath / Resource ID" value={node.data.selector} onChange={(e) => onUpdate(node.id, { selector: e.target.value })} className="h-8 text-sm" />
      </div>
    </div>
  )
}
