import type { NodeProps, Node } from "@xyflow/react"
import { X } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { AppCloseData } from "../types"

export function AppCloseNode({ id, data, selected }: NodeProps<Node<AppCloseData>>) {
  return (
    <BaseNode id={id} label={data.label} status={data.status} nodeKind="appClose" icon={X} selected={selected}>
      <NodeField label="包名" value={data.packageName} mono />
    </BaseNode>
  )
}
