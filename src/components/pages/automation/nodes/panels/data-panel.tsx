import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { DataNodeData } from "../types"

type Props = {
  node: { id: string; data: DataNodeData }
  onUpdate: (id: string, data: Partial<DataNodeData>) => void
}

export function DataPanel({ node, onUpdate }: Props) {
  const sqlPlaceholder =
    node.data.action === "query"
      ? "SELECT * FROM users WHERE id = ?"
      : "UPDATE users SET status = 1 WHERE id = ?"

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
        <p className="text-xs text-muted-foreground">数据源</p>
        <Input
          value={node.data.datasource}
          onChange={(e) => onUpdate(node.id, { datasource: e.target.value })}
          placeholder="mysql://localhost:3306/db"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">SQL 语句</p>
        <Textarea
          value={node.data.sql}
          onChange={(e) => onUpdate(node.id, { sql: e.target.value })}
          placeholder={sqlPlaceholder}
          className="text-sm min-h-[80px] resize-none"
        />
      </div>
    </div>
  )
}
