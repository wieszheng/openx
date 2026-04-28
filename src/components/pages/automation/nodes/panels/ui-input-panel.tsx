import { Input } from "@/components/ui/input"
import type { UIInputData } from "../types"

type Props = {
  node: { id: string; data: UIInputData }
  onUpdate: (id: string, data: Partial<UIInputData>) => void
}

export function UIInputPanel({ node, onUpdate }: Props) {
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
        <p className="text-xs text-muted-foreground">输入文本</p>
        <Input placeholder="输入内容" value={node.data.inputText} onChange={(e) => onUpdate(node.id, { inputText: e.target.value })} className="h-8 text-sm" />
      </div>
    </div>
  )
}
