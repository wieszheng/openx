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
export type AppLaunchData = {
  kind: "appLaunch"
  label: string
  status: NodeStatus
  packageName: string
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
  badge: string
}> = {
  trigger: { iconBg: "bg-violet-500/10", iconText: "text-violet-500", handle: "!bg-violet-500", border: "border-violet-500", badge: "bg-violet-500/10 text-violet-500" },
  appUi:   { iconBg: "bg-blue-500/10",   iconText: "text-blue-500",   handle: "!bg-blue-500",   border: "border-blue-500",   badge: "bg-blue-500/10 text-blue-500" },
  api:     { iconBg: "bg-cyan-500/10",   iconText: "text-cyan-500",   handle: "!bg-cyan-500",   border: "border-cyan-500",   badge: "bg-cyan-500/10 text-cyan-500" },
  data:    { iconBg: "bg-amber-500/10",  iconText: "text-amber-500",  handle: "!bg-amber-500",  border: "border-amber-500",  badge: "bg-amber-500/10 text-amber-500" },
  assert:  { iconBg: "bg-emerald-500/10",iconText: "text-emerald-500",handle: "!bg-emerald-500",border: "border-emerald-500",badge: "bg-emerald-500/10 text-emerald-500" },
}

// ─── 分类标签 ─────────────────────────────────────────────
export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  trigger: "触发器",
  appUi:   "APP UI 操作",
  api:     "接口请求",
  data:    "数据操作",
  assert:  "断言",
}
