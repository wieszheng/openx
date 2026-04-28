import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { DbExecuteData } from "../types"

type Props = {
  node: { id: string; data: DbExecuteData }
  onUpdate: (id: string, data: Partial<DbExecuteData>) => void
}

export function DbExecutePanel({ node, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">节点名称</p>
        <Input value={node.data.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">数据源</p>
        <Input placeholder="数据源名称" value={node.data.datasource} onChange={(e) => onUpdate(node.id, { datasource: e.target.value })} className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">SQL 语句</p>
        <Textarea
          placeholder="INSERT INTO / UPDATE / DELETE ..."
          value={node.data.sql}
          onChange={(e) => onUpdate(node.id, { sql: e.target.value })}
          className="text-sm font-mono resize-none"
          rows={4}
        />
      </div>
    </div>
  )
}
