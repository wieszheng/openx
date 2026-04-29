import type { NodeProps, Node } from "@xyflow/react"
import { Move } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { UISwipeData } from "../types"

const DIRECTION_LABELS: Record<string, string> = {
  up: "向上", down: "向下", left: "向左", right: "向右",
}

export function UISwipeNode({ id, data, selected }: NodeProps<Node<UISwipeData>>) {
  return (
    <BaseNode id={id} label={data.label} status={data.status} nodeKind="uiSwipe" icon={Move} selected={selected}>
      <NodeField label="方向" value={DIRECTION_LABELS[data.direction] ?? data.direction} />
      <NodeField label="时长" value={data.duration ? `${data.duration} ms` : undefined} empty="未配置" />
    </BaseNode>
  )
}
