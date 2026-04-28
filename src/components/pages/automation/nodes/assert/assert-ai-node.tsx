import type { NodeProps, Node } from "@xyflow/react"
import { Bot } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { AssertAIData } from "../types"

export function AssertAINode({ data, selected }: NodeProps<Node<AssertAIData>>) {
  return (
    <BaseNode label={data.label} status={data.status} nodeKind="assertAI" icon={Bot} selected={selected}>
      <NodeField label="提示词" value={data.prompt} />
    </BaseNode>
  )
}
