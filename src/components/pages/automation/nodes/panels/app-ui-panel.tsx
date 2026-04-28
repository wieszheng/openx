import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export function AppUIPanel({ node, onUpdate }: { node: any; onUpdate: (id: string, data: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input
          value={node.data.label ?? ""}
          onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">执行模型</p>
        <Select defaultValue="appium-operator">
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
        <p className="text-xs text-muted-foreground">元素选择器 (XPath/ID)</p>
        <Input
          placeholder="//android.widget.Button[@text='提交']"
          className="h-8 text-sm"
        />
      </div>
      {node.data.label?.includes("输入") && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">输入文本</p>
          <Input
            placeholder="请输入需要填写的文本"
            className="h-8 text-sm"
          />
        </div>
      )}
      <div className="space-y-2 mt-4">
        <div className="flex items-center justify-between rounded-lg border p-2.5">
          <span className="text-sm">失败重试</span>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-2.5">
          <span className="text-sm">截图留存</span>
          <Switch defaultChecked />
        </div>
      </div>
    </div>
  )
}
