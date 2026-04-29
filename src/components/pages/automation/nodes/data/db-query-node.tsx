import type { NodeProps, Node } from "@xyflow/react"
import { Database } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { DbQueryData } from "../types"

export function DbQueryNode({ id, data, selected }: NodeProps<Node<DbQueryData>>) {
  return (
    <BaseNode id={id} label={data.label} status={data.status} nodeKind="dbQuery" icon={Database} selected={selected}>
      <NodeField label="数据源" value={data.datasource} />
      <NodeField label="SQL" value={data.sql} mono />
    </BaseNode>
  )
}
