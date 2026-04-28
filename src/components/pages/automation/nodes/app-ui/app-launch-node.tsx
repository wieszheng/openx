import type { NodeProps, Node } from "@xyflow/react"
import { Flame, Snowflake, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { BaseNode, NodeField } from "../base-node"
import type { AppLaunchData, LaunchType } from "../types"

const LAUNCH_TYPE_CONFIG: Record<LaunchType, {
  label: string
  icon: typeof Flame
  className: string
}> = {
  warm: { label: "热启动", icon: Flame, className: "bg-orange-500/10 text-orange-600" },
  cold: { label: "冷启动", icon: Snowflake, className: "bg-sky-500/10 text-sky-600" },
}

export function AppLaunchNode({ data, selected }: NodeProps<Node<AppLaunchData>>) {
  const launchTypeConfig = LAUNCH_TYPE_CONFIG[data.launchType]
  const LaunchIcon = launchTypeConfig.icon

  return (
    <BaseNode label={data.label} status={data.status} nodeKind="appLaunch" icon={Play} selected={selected}>
      <NodeField label="包名" value={data.packageName} mono />
      {/* 启动类型徽章 */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none bg-muted text-muted-foreground/70">
          类型
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
            launchTypeConfig.className
          )}
        >
          <LaunchIcon className="size-2.5" />
          {launchTypeConfig.label}
        </span>
      </div>
    </BaseNode>
  )
}
