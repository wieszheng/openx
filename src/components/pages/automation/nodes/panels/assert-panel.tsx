import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AssertNodeData } from "../types"

type Props = {
  node: { id: string; data: AssertNodeData }
  onUpdate: (id: string, data: Partial<AssertNodeData>) => void
}

export function AssertPanel({ node, onUpdate }: Props) {
  const { action } = node.data

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input
          value={node.data.label}
          onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          className="h-8 text-sm"
        />
      </div>

      {(action === "text" || action === "exists") && (
        <>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">元素选择器</p>
            <Input
              value={node.data.selector ?? ""}
              onChange={(e) => onUpdate(node.id, { selector: e.target.value })}
              placeholder="//android.widget.TextView"
              className="h-8 text-sm"
            />
          </div>
          {action === "text" && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">预期文本</p>
              <Input
                value={node.data.expected ?? ""}
                onChange={(e) => onUpdate(node.id, { expected: e.target.value })}
                placeholder="期望显示的文本内容"
                className="h-8 text-sm"
              />
            </div>
          )}
        </>
      )}

      {action === "ai" && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">AI 分析指令</p>
          <Textarea
            value={node.data.prompt ?? ""}
            onChange={(e) => onUpdate(node.id, { prompt: e.target.value })}
            placeholder="描述需要 AI 分析验证的内容..."
            className="text-sm min-h-[80px] resize-none"
          />
        </div>
      )}
    </div>
  )
}
