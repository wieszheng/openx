import type { NodeProps, Node } from "@xyflow/react"
import { Sparkles } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { ApiNotifyData } from "../types"

export function ApiNotifyNode({ data, selected }: NodeProps<Node<ApiNotifyData>>) {
  return (
    <BaseNode label={data.label} status={data.status} nodeKind="apiNotify" icon={Sparkles} selected={selected}>
      <NodeField label="URL" value={data.url} mono />
    </BaseNode>
  )
}
