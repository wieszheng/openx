import type { NodeProps, Node } from "@xyflow/react"
import { ScanSearch } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { AssertExistsData } from "../types"

export function AssertExistsNode({ id, data, selected }: NodeProps<Node<AssertExistsData>>) {
  return (
    <BaseNode id={id} label={data.label} status={data.status} nodeKind="assertExists" icon={ScanSearch} selected={selected}>
      <NodeField label="选择器" value={data.selector} mono />
    </BaseNode>
  )
}
