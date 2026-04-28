import { Input } from "@/components/ui/input"
import type { UIWaitData } from "../types"

type Props = {
  node: { id: string; data: UIWaitData }
  onUpdate: (id: string, data: Partial<UIWaitData>) => void
}

export function UIWaitPanel({ node, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input value={node.data.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">等待元素（选择器）</p>
        <Input placeholder="XPath / Resource ID" value={node.data.selector} onChange={(e) => onUpdate(node.id, { selector: e.target.value })} className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">超时时间（ms）</p>
        <Input type="number" value={node.data.timeout} onChange={(e) => onUpdate(node.id, { timeout: Number(e.target.value) })} className="h-8 text-sm" />
      </div>
    </div>
  )
}
