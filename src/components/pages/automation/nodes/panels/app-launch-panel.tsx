import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AppLaunchData } from "../types"

type Props = {
  node: { id: string; data: AppLaunchData }
  onUpdate: (id: string, data: Partial<AppLaunchData>) => void
}

export function AppLaunchPanel({ node, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input value={node.data.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">应用包名</p>
        <Input placeholder="如 com.example.app" value={node.data.packageName} onChange={(e) => onUpdate(node.id, { packageName: e.target.value })} className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">启动类型</p>
        <Select value={node.data.launchType} onValueChange={(v) => onUpdate(node.id, { launchType: v as AppLaunchData["launchType"] })}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="warm">热启动</SelectItem>
            <SelectItem value="cold">冷启动</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
