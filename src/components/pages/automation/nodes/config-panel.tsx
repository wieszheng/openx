import { X, Trash2, CheckCircle2, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { configPanelRegistry } from "./node-registry"
import type { NodeKind, AnyNodeData } from "./types"

const MOCK_LOGS = [
  "22:16:31 节点执行成功: 状态 200",
  "22:16:33 数据验证通过: 响应耗时 1.2s",
]

type ConfigPanelProps = {
  node: { id: string; type: string; data: AnyNodeData } | null
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
  onUpdate: (id: string, data: Partial<AnyNodeData>) => void
}

export function ConfigPanel({ node, isOpen, onClose, onDelete, onUpdate }: ConfigPanelProps) {
  const PanelContent = node?.type
    ? configPanelRegistry[node.type as NodeKind]
    : null

  return (
    <div
      className={`
        absolute right-4 top-1/2 -translate-y-1/2 z-20 w-[300px] transition-all duration-300
        ${isOpen && node ? "translate-x-0 opacity-100" : "translate-x-[120%] opacity-0 pointer-events-none"}
      `}
    >
      <Card className="shadow-2xl border-2 backdrop-blur-md bg-background/95">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">节点配置</CardTitle>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={onDelete}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除节点</TooltipContent>
              </Tooltip>
              <Button size="icon-xs" variant="ghost" onClick={onClose}>
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground truncate pr-4">
            {node?.data?.label ?? "未选择节点"}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {PanelContent && node && (
            <PanelContent node={node} onUpdate={onUpdate} />
          )}

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium">执行日志</p>
            <ScrollArea className="h-28 rounded-md border p-2">
              <div className="space-y-1">
                {MOCK_LOGS.map((log, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{log}</p>
                ))}
              </div>
            </ScrollArea>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                98.7%
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3.5 text-amber-500" />
                1.8s
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
