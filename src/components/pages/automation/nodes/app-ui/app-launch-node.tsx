import type { NodeProps, Node } from "@xyflow/react"
import { Play } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { AppLaunchData } from "../types"

export function AppLaunchNode({ data, selected }: NodeProps<Node<AppLaunchData>>) {
  return (
    <BaseNode label={data.label} status={data.status} nodeKind="appLaunch" icon={Play} selected={selected}>
      <NodeField label="包名" value={data.packageName} mono />
    </BaseNode>
  )
}
