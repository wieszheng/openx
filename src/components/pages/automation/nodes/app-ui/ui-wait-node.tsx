import type { NodeProps, Node } from "@xyflow/react"
import { Clock3 } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { UIWaitData } from "../types"

export function UIWaitNode({ data, selected }: NodeProps<Node<UIWaitData>>) {
  return (
    <BaseNode label={data.label} status={data.status} nodeKind="uiWait" icon={Clock3} selected={selected}>
      <NodeField label="选择器" value={data.selector} mono />
      <NodeField label="超时" value={data.timeout ? `${data.timeout} ms` : undefined} empty="未配置" />
    </BaseNode>
  )
}
