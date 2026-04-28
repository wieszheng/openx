import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AssertAIData } from "../types"

type Props = {
  node: { id: string; data: AssertAIData }
  onUpdate: (id: string, data: Partial<AssertAIData>) => void
}

export function AssertAIPanel({ node, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input value={node.data.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">AI 分析提示词</p>
        <Textarea
          placeholder="请描述要分析的内容，如：验证页面是否正常加载，图片是否显示完整..."
          value={node.data.prompt}
          onChange={(e) => onUpdate(node.id, { prompt: e.target.value })}
          className="text-sm resize-none"
          rows={4}
        />
      </div>
    </div>
  )
}
