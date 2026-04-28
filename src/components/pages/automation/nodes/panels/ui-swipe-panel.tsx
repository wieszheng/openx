import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UISwipeData, UISwipeDirection } from "../types"

type Props = {
  node: { id: string; data: UISwipeData }
  onUpdate: (id: string, data: Partial<UISwipeData>) => void
}

export function UISwipePanel({ node, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input value={node.data.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">滑动方向</p>
        <Select value={node.data.direction} onValueChange={(v) => onUpdate(node.id, { direction: v as UISwipeDirection })}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="up">向上</SelectItem>
            <SelectItem value="down">向下</SelectItem>
            <SelectItem value="left">向左</SelectItem>
            <SelectItem value="right">向右</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">持续时长（ms）</p>
        <Input type="number" value={node.data.duration} onChange={(e) => onUpdate(node.id, { duration: Number(e.target.value) })} className="h-8 text-sm" />
      </div>
    </div>
  )
}
