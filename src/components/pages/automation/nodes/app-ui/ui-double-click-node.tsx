import type { NodeProps, Node } from "@xyflow/react"
import { Fingerprint } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { UIDoubleClickData } from "../types"

export function UIDoubleClickNode({ data, selected }: NodeProps<Node<UIDoubleClickData>>) {
  return (
    <BaseNode label={data.label} status={data.status} nodeKind="uiDoubleClick" icon={Fingerprint} selected={selected}>
      <NodeField label="选择器" value={data.selector} mono />
    </BaseNode>
  )
}
