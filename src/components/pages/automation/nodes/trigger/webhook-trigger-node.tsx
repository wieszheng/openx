import type { NodeProps, Node } from "@xyflow/react"
import { Webhook } from "lucide-react"
import { BaseNode, NodeField } from "../base-node"
import type { WebhookTriggerData } from "../types"

export function WebhookTriggerNode({ id, data, selected }: NodeProps<Node<WebhookTriggerData>>) {
  return (
    <BaseNode id={id} label={data.label} status={data.status} nodeKind="webhookTrigger" icon={Webhook} selected={selected}>
      <NodeField label="URL" value={data.webhookUrl} mono empty="系统自动生成" />
    </BaseNode>
  )
}
