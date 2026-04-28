import type { NodeProps, Node } from "@xyflow/react"
import { MousePointer2 } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { UIClickData } from "../types"

export function UIClickNode({ data, selected }: NodeProps<Node<UIClickData>>) {
  return (
    <BaseNode label={data.label} status={data.status} nodeKind="uiClick" icon={MousePointer2} selected={selected}>
      <NodeField label="选择器" value={data.selector} mono />
    </BaseNode>
  )
}
