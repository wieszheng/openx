export type NodeStatus = "已配置" | "运行中" | "待配置"

// ─── 节点分类 ────────────────────────────────────────────
export type NodeCategory = "trigger" | "appUi" | "api" | "data" | "assert"

// ─── 节点类型 key（每个动作一个独立类型）─────────────────
export type NodeKind =
  | "webhookTrigger"
  | "appLaunch" | "appClose" | "uiClick" | "uiDoubleClick" | "uiSwipe" | "uiInput" | "uiWait"
  | "apiHttp" | "apiNotify"
  | "dbQuery" | "dbExecute"
  | "assertText" | "assertExists" | "assertAI"

export const NODE_KIND_TO_CATEGORY: Record<NodeKind, NodeCategory> = {
  webhookTrigger: "trigger",
  appLaunch:      "appUi",
  appClose:       "appUi",
  uiClick:        "appUi",
  uiDoubleClick:  "appUi",
  uiSwipe:        "appUi",
  uiInput:        "appUi",
  uiWait:         "appUi",
  apiHttp:        "api",
  apiNotify:      "api",
  dbQuery:        "data",
  dbExecute:      "data",
  assertText:     "assert",
  assertExists:   "assert",
  assertAI:       "assert",
}

// ─── 触发器 ───────────────────────────────────────────────
export type WebhookTriggerData = {
  kind: "webhookTrigger"
  label: string
  status: NodeStatus
  webhookUrl: string
}

// ─── APP UI 操作 ──────────────────────────────────────────
export type LaunchType = "warm" | "cold"  // 热启动 | 冷启动

export type AppLaunchData = {
  kind: "appLaunch"
  label: string
  status: NodeStatus
  packageName: string
  launchType: LaunchType
}

export type AppCloseData = {
  kind: "appClose"
  label: string
  status: NodeStatus
  packageName: string
}

export type UIClickData = {
  kind: "uiClick"
  label: string
  status: NodeStatus
  selector: string
}

export type UIDoubleClickData = {
  kind: "uiDoubleClick"
  label: string
  status: NodeStatus
  selector: string
}

export type UISwipeDirection = "up" | "down" | "left" | "right"

export type UISwipeData = {
  kind: "uiSwipe"
  label: string
  status: NodeStatus
  direction: UISwipeDirection
  duration: number
}

export type UIInputData = {
  kind: "uiInput"
  label: string
  status: NodeStatus
  selector: string
  inputText: string
}

export type UIWaitData = {
  kind: "uiWait"
  label: string
  status: NodeStatus
  selector: string
  timeout: number
}

// ─── 接口请求 ─────────────────────────────────────────────
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"

export type ApiHttpData = {
  kind: "apiHttp"
  label: string
  status: NodeStatus
  method: HttpMethod
  url: string
}

export type ApiNotifyData = {
  kind: "apiNotify"
  label: string
  status: NodeStatus
  url: string
}

// ─── 数据操作 ─────────────────────────────────────────────
export type DbQueryData = {
  kind: "dbQuery"
  label: string
  status: NodeStatus
  datasource: string
  sql: string
}

export type DbExecuteData = {
  kind: "dbExecute"
  label: string
  status: NodeStatus
  datasource: string
  sql: string
}

// ─── 断言 ─────────────────────────────────────────────────
export type AssertTextData = {
  kind: "assertText"
  label: string
  status: NodeStatus
  selector: string
  expected: string
}

export type AssertExistsData = {
  kind: "assertExists"
  label: string
  status: NodeStatus
  selector: string
}

export type AssertAIData = {
  kind: "assertAI"
  label: string
  status: NodeStatus
  prompt: string
}

// ─── 联合类型 ─────────────────────────────────────────────
export type AnyNodeData =
  | WebhookTriggerData
  | AppLaunchData | AppCloseData | UIClickData | UIDoubleClickData | UISwipeData | UIInputData | UIWaitData
  | ApiHttpData | ApiNotifyData
  | DbQueryData | DbExecuteData
  | AssertTextData | AssertExistsData | AssertAIData

// ─── 样式映射（按 Category）────────────────────────────────
export const CATEGORY_STYLES: Record<NodeCategory, {
  iconBg: string
  iconText: string
  handle: string
  border: string
  solidBg: string
  /** conic-gradient 光束两色，格式 "color1, color2" */
  beamColor: string
  /** 已选中/已配置 外发光 box-shadow class */
  glow: string
  /** 已配置状态 inline shadow（稍弱，用于静态边框）*/
  configuredShadow: string
  badge: string
  labelText: string
  /** 状态图标颜色（已配置时跟随分类）*/
  statusText: string
}> = {
  trigger: { iconBg: "bg-violet-500/10",  iconText: "text-violet-500",  handle: "!bg-violet-500",  border: "border-violet-500",  solidBg: "bg-violet-500",  beamColor: "#8b5cf6, #c4b5fd",  glow: "shadow-[0_0_20px_#8b5cf650]",  configuredShadow: "shadow-[0_0_14px_#8b5cf635]",  badge: "bg-violet-500/10 text-violet-500",  labelText: "text-violet-500",  statusText: "text-violet-500" },
  appUi:   { iconBg: "bg-blue-500/10",    iconText: "text-blue-500",   handle: "!bg-blue-500",   border: "border-blue-500",   solidBg: "bg-blue-500",   beamColor: "#3b82f6, #93c5fd",  glow: "shadow-[0_0_20px_#3b82f650]",  configuredShadow: "shadow-[0_0_14px_#3b82f635]",  badge: "bg-blue-500/10 text-blue-500",   labelText: "text-blue-500",  statusText: "text-blue-500" },
  api:     { iconBg: "bg-cyan-500/10",    iconText: "text-cyan-500",   handle: "!bg-cyan-500",   border: "border-cyan-500",   solidBg: "bg-cyan-500",   beamColor: "#06b6d4, #67e8f9",  glow: "shadow-[0_0_20px_#06b6d450]",  configuredShadow: "shadow-[0_0_14px_#06b6d435]",  badge: "bg-cyan-500/10 text-cyan-500",   labelText: "text-cyan-500",  statusText: "text-cyan-500" },
  data:    { iconBg: "bg-amber-500/10",   iconText: "text-amber-500",  handle: "!bg-amber-500",  border: "border-amber-500",  solidBg: "bg-amber-500",  beamColor: "#f59e0b, #fde68a",  glow: "shadow-[0_0_20px_#f59e0b50]",  configuredShadow: "shadow-[0_0_14px_#f59e0b35]",  badge: "bg-amber-500/10 text-amber-500",  labelText: "text-amber-500",  statusText: "text-amber-500" },
  assert:  { iconBg: "bg-emerald-500/10", iconText: "text-emerald-500",handle: "!bg-emerald-500",border: "border-emerald-500",solidBg: "bg-emerald-500",beamColor: "#10b981, #6ee7b7",  glow: "shadow-[0_0_20px_#10b98150]",  configuredShadow: "shadow-[0_0_14px_#10b98135]",  badge: "bg-emerald-500/10 text-emerald-500", labelText: "text-emerald-500",  statusText: "text-emerald-500" },
}

// ─── 分类标签 ─────────────────────────────────────────────
export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  trigger: "触发器",
  appUi:   "APP UI 操作",
  api:     "接口请求",
  data:    "数据操作",
  assert:  "断言",
}
