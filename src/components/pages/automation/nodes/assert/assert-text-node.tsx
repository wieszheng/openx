import type { NodeProps, Node } from "@xyflow/react"
import { CheckCircle2 } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { AssertTextData } from "../types"

export function AssertTextNode({ data, selected }: NodeProps<Node<AssertTextData>>) {
  return (
    <BaseNode label={data.label} status={data.status} nodeKind="assertText" icon={CheckCircle2} selected={selected}>
      <NodeField label="选择器" value={data.selector} mono />
      <NodeField label="期望值" value={data.expected} />
    </BaseNode>
  )
}
