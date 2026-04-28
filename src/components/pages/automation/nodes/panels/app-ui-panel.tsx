import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { AppUINodeData } from "../types"

type Props = {
  node: { id: string; data: AppUINodeData }
  onUpdate: (id: string, data: Partial<AppUINodeData>) => void
}

export function AppUIPanel({ node, onUpdate }: Props) {
  const needsInput = node.data.action === "input"

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

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">执行模型</p>
        <Select
          value={node.data.engine}
          onValueChange={(v) => onUpdate(node.id, { engine: v as AppUINodeData["engine"] })}
        >
          <SelectTrigger className="w-full h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="appium-operator">appium-operator</SelectItem>
            <SelectItem value="uiautomator2">uiautomator2</SelectItem>
            <SelectItem value="xctest">xctest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">元素选择器（XPath / ID）</p>
        <Input
          value={node.data.selector}
          onChange={(e) => onUpdate(node.id, { selector: e.target.value })}
          placeholder="//android.widget.Button[@text='提交']"
          className="h-8 text-sm"
        />
      </div>

      {needsInput && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">输入文本</p>
          <Input
            value={node.data.inputText ?? ""}
            onChange={(e) => onUpdate(node.id, { inputText: e.target.value })}
            placeholder="请输入需要填写的文本"
            className="h-8 text-sm"
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border p-2.5">
          <span className="text-sm">失败重试</span>
          <Switch
            checked={node.data.retry}
            onCheckedChange={(v) => onUpdate(node.id, { retry: v })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-2.5">
          <span className="text-sm">截图留存</span>
          <Switch
            checked={node.data.screenshot}
            onCheckedChange={(v) => onUpdate(node.id, { screenshot: v })}
          />
        </div>
      </div>
    </div>
  )
}
