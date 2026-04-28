import type { NodeProps, Node } from "@xyflow/react"
import { DatabaseZap } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { DbExecuteData } from "../types"

export function DbExecuteNode({ data, selected }: NodeProps<Node<DbExecuteData>>) {
  return (
    <BaseNode label={data.label} status={data.status} nodeKind="dbExecute" icon={DatabaseZap} selected={selected}>
      <NodeField label="数据源" value={data.datasource} />
      <NodeField label="SQL" value={data.sql} mono />
    </BaseNode>
  )
}
