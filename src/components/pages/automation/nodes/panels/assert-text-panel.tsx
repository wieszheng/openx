import { Input } from "@/components/ui/input"
import type { AssertTextData } from "../types"

type Props = {
  node: { id: string; data: AssertTextData }
  onUpdate: (id: string, data: Partial<AssertTextData>) => void
}

export function AssertTextPanel({ node, onUpdate }: Props) {
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
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">期望文本</p>
        <Input placeholder="期望显示的文本内容" value={node.data.expected} onChange={(e) => onUpdate(node.id, { expected: e.target.value })} className="h-8 text-sm" />
      </div>
    </div>
  )
}
