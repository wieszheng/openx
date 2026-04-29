import type { NodeProps, Node } from "@xyflow/react"
import { Type } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { UIInputData } from "../types"

export function UIInputNode({ id, data, selected }: NodeProps<Node<UIInputData>>) {
  return (
    <BaseNode id={id} label={data.label} status={data.status} nodeKind="uiInput" icon={Type} selected={selected}>
      <NodeField label="选择器" value={data.selector} mono />
      <NodeField label="输入文本" value={data.inputText} />
    </BaseNode>
  )
}
