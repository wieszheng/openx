/** 工作流系统类型定义 */

// ── 节点类型 ──────────────────────────────────────────────────────────────

export type WorkflowNodeType =
  | 'trigger-manual'
  | 'action-screenshot'
  | 'action-tap'
  | 'action-swipe'
  | 'action-input-text'
  | 'action-install-app'
  | 'action-uninstall-app'
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

export interface ActionSwipeParams {
  x1: number
  y1: number
  x2: number
  y2: number
  duration: number // ms
}

export interface ActionInputTextParams {
  text: string
}

export interface ActionInstallAppParams {
  packagePath: string // 本地文件路径
}

export interface ActionUninstallAppParams {
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
  | ActionSwipeParams
  | ActionInputTextParams
  | ActionInstallAppParams
  | ActionUninstallAppParams
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
  timestamp: number
  duration?: number // ms
}

export interface WorkflowRunPayload {
  workflow: Workflow
  deviceId: string
}

export interface WorkflowRunResult {
  ok: boolean
  error?: string
}
