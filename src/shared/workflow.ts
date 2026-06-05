/** 工作流系统类型定义 */

// ── 节点类型 ──────────────────────────────────────────────────────────────

export type WorkflowNodeType =
  | 'trigger-manual'
  | 'action-screenshot'
  | 'action-tap'
  | 'action-double-tap'
  | 'action-long-click'
  | 'action-swipe'
  | 'action-drag'
  | 'action-input-text'
  | 'action-clear-text'
  | 'action-key-event'
  | 'action-install-app'
  | 'action-uninstall-app'
  | 'action-launch-app'
  | 'action-close-app'
  | 'action-shell'
  | 'action-get-var'
  | 'action-set-var'
  | 'control-if'
  | 'control-loop'
  | 'control-delay'

// ── 节点参数定义 ─────────────────────────────────────────────────────────

export interface TriggerManualParams {
  label?: string
}

export interface ActionScreenshotParams {
  saveToVar?: string // 将 base64 存到变量
}

export interface ActionTapParams {
  x: number
  y: number
}

export interface ActionDoubleTapParams {
  x: number
  y: number
}

export interface ActionLongClickParams {
  x: number
  y: number
  duration?: number // ms，默认 2000
}

export interface ActionSwipeParams {
  x1: number
  y1: number
  x2: number
  y2: number
  duration: number // ms
}

export interface ActionDragParams {
  x1: number
  y1: number
  x2: number
  y2: number
  duration: number // ms
}

export interface ActionInputTextParams {
  text: string
  x?: number  // 可选：输入前先点击该坐标（聚焦输入框）
  y?: number
}

export interface ActionClearTextParams {
  length?: number // 最大删除字符数，默认 100
}

export interface ActionKeyEventParams {
  keyCode: number // Android: 4=返回 3=主屏 187=任务; Harmony: 2=返回 1=主屏 3=任务
}

export interface ActionInstallAppParams {
  packagePath: string // 本地文件路径
}

export interface ActionUninstallAppParams {
  packageName: string
}

export interface ActionLaunchAppParams {
  packageName: string
  activity?: string  // Harmony 的 mainAbility，Android 可省略（自动探测）
  cold?: boolean     // true=冷启动（先 force-stop），false/undefined=热启动
}

export interface ActionCloseAppParams {
  packageName: string
}

export interface ActionShellParams {
  command: string
  saveToVar?: string // 将命令输出存到变量
}

export interface ActionGetVarParams {
  key: string
  saveToVar: string // 存到运行时上下文变量名
}

export interface ActionSetVarParams {
  key: string
  value: string // 支持 {{varName}} 模板引用
}

export interface ControlIfParams {
  condition: string // JS 表达式，可用 ctx.key 引用上下文变量
}

export interface ControlLoopParams {
  count: number
}

export interface ControlDelayParams {
  ms: number
}

export type WorkflowNodeParams =
  | TriggerManualParams
  | ActionScreenshotParams
  | ActionTapParams
  | ActionDoubleTapParams
  | ActionLongClickParams
  | ActionSwipeParams
  | ActionDragParams
  | ActionInputTextParams
  | ActionClearTextParams
  | ActionKeyEventParams
  | ActionInstallAppParams
  | ActionUninstallAppParams
  | ActionLaunchAppParams
  | ActionCloseAppParams
  | ActionShellParams
  | ActionGetVarParams
  | ActionSetVarParams
  | ControlIfParams
  | ControlLoopParams
  | ControlDelayParams

// ── 工作流图结构 ─────────────────────────────────────────────────────────

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string // 'yes' | 'no' | 'loop-body' | 'loop-done' | null (default)
  targetHandle?: string
}

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  label: string
  params: WorkflowNodeParams
  position: { x: number; y: number }
}

export interface Workflow {
  id: string
  name: string
  description?: string
  deviceId?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: number
  updatedAt: number
}

// ── 执行系统类型 ─────────────────────────────────────────────────────────

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'done' | 'error' | 'stopped'

export type StepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped'

export interface ExecutionLog {
  id: string
  nodeId: string
  nodeType: WorkflowNodeType
  nodeLabel: string
  status: StepStatus
  message?: string
  output?: string
  imageData?: string  // data URL，截图节点成功时携带
  timestamp: number
  duration?: number // ms
}

export interface WorkflowRunPayload {
  workflow: Workflow
  deviceId?: string
}

export interface WorkflowRunResult {
  ok: boolean
  error?: string
}
