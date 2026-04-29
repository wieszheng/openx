import type { NodeProps, Node } from "@xyflow/react"
import { Sparkles } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { ApiNotifyData } from "../types"

export function ApiNotifyNode({ id, data, selected }: NodeProps<Node<ApiNotifyData>>) {
  return (
    <BaseNode id={id} label={data.label} status={data.status} nodeKind="apiNotify" icon={Sparkles} selected={selected}>
      <NodeField label="URL" value={data.url} mono />
    </BaseNode>
  )
}
