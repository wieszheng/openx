/** Agent 运行时类型定义 */

import type { Workflow, WorkflowNodeParams, WorkflowNodeType } from './workflow'
// ── 会话状态 ──────────────────────────────────────────────────────────────

export type AgentStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'done'
  | 'failed'
  | 'stopped'

export type AgentRunMode = 'auto' | 'debug'

// ── 检查点（每步屏幕证据） ────────────────────────────────────────────────

export interface OcrItem {
  text: string
  box: [[number, number], [number, number], [number, number], [number, number]]
}

export interface Checkpoint {
  nodeId: string
  nodeLabel: string
  nodeType: string
  timestamp: number
  ok: boolean
  output?: string
  screenshotBase64?: string
  screenshotMime?: 'image/png' | 'image/jpeg'
  ocrItems?: OcrItem[]
  duration?: number
}

// ── 执行上下文 ────────────────────────────────────────────────────────────

export interface AgentExecutionContext {
  deviceId?: string
  currentNodeId?: string
  failedNodeId?: string
  checkpoints: Checkpoint[]
  completedNodeIds: string[]
}

// ── 运行载荷 ──────────────────────────────────────────────────────────────

export interface AgentStartPayload {
  workflow: Workflow
  deviceId?: string
  baseUrl?: string
  mode?: AgentRunMode
  /** 断点节点 ID 列表 */
  breakpoints?: string[]
  /** 从指定节点重试（跳过此前已完成的节点） */
  fromNodeId?: string
  /** 步骤后断言：nodeId → 断言规则 */
  stepAssertions?: Record<string, StepAssertion[]>
  /** 用例级验收断言 */
  acceptanceCriteria?: StepAssertion[]
  /** 失败时自动诊断并修补重试 */
  autoRepair?: boolean
  /** 最大自动修复次数 */
  maxRepairAttempts?: number
}

export interface AgentRunResult {
  ok: boolean
  error?: string
}

// ── 事件流（main → renderer） ─────────────────────────────────────────────

export type AgentEvent =
  | { type: 'status'; status: AgentStatus; mode?: AgentRunMode }
  | { type: 'step_start'; nodeId: string; nodeLabel: string; nodeType: string }
  | { type: 'step_end'; checkpoint: Checkpoint }
  | { type: 'assertion_result'; nodeId: string; results: AssertionResult[] }
  | { type: 'paused'; nodeId?: string; reason: 'debug' | 'breakpoint' | 'failure' | 'user' | 'assertion' }
  | { type: 'plan_start' }
  | { type: 'plan_stream_init'; workflowId: string; name: string; description: string; triggerNode: import('./workflow').WorkflowNode }
  | { type: 'plan_step_applied'; stepIndex: number; totalSteps: number; step: PlanStep; node: import('./workflow').WorkflowNode; edge: import('./workflow').WorkflowEdge }
  | { type: 'plan_think'; kind: 'info'; message: string }
  | { type: 'plan_think'; kind: 'stream'; delta: string }
  | { type: 'plan_think'; kind: 'stream_reset' }
  | { type: 'plan_done'; draft: WorkflowDraft }
  | { type: 'plan_error'; message: string }
  | { type: 'repair_start'; failure: FailureReport }
  | { type: 'repair_proposal'; proposal: RepairProposal }
  | { type: 'repair_applied'; proposal: RepairProposal; workflow: Workflow }
  | { type: 'repair_failed'; failure: FailureReport; reason: string }
  | { type: 'workflow_patched'; workflow: Workflow; patches: WorkflowPatch[] }
  | { type: 'done'; summary: AgentRunSummary }
  | { type: 'error'; message: string }

export interface AgentRunSummary {
  totalSteps: number
  successSteps: number
  failedSteps: number
  duration: number
  failedNodeId?: string
  repairAttempts?: number
  status: 'done' | 'failed' | 'stopped'
}

// ── 错误修复 ──────────────────────────────────────────────────────────────

export type FailureType =
  | 'OCR_NOT_FOUND'
  | 'ASSERTION_FAIL'
  | 'EXECUTION_ERROR'
  | 'TIMEOUT'
  | 'DEVICE_ERROR'
  | 'UNKNOWN'

export interface FailureReport {
  nodeId: string
  nodeLabel: string
  nodeType: string
  failureType: FailureType
  message: string
  checkpoint?: Checkpoint
}

export type WorkflowPatch =
  | { op: 'update_params'; nodeId: string; params: Record<string, unknown>; description: string }
  | { op: 'update_post_delay'; nodeId: string; postDelayMs: number; description: string }

export interface RepairProposal {
  failure: FailureReport
  patches: WorkflowPatch[]
  confidence: 'high' | 'medium' | 'low'
  autoApplicable: boolean
  summary: string
}

export interface AgentApplyRepairPayload {
  workflow: Workflow
  proposal: RepairProposal
}

export interface AgentApplyRepairResult {
  ok: boolean
  workflow?: Workflow
  error?: string
}

// ── 会话快照（供 UI 展示） ────────────────────────────────────────────────

export interface AgentSessionSnapshot {
  status: AgentStatus
  mode: AgentRunMode
  workflowId?: string
  workflowName?: string
  execution: AgentExecutionContext
}

// ── 规划器 ────────────────────────────────────────────────────────────────

export interface AgentIntent {
  description: string
  deviceId?: string
  baseUrl?: string
}

export interface StepAssertion {
  type: 'ocr_contains' | 'ocr_not_contains' | 'ocr_equals' | 'var_equals' | 'output_contains'
  value: string
  varKey?: string
}

export interface AssertionResult {
  assertion: StepAssertion
  ok: boolean
  expected: string
  actual: string
}

export interface PlanStep {
  intent: string
  type: WorkflowNodeType
  label: string
  params: WorkflowNodeParams
  postDelayMs?: number
  assertions?: StepAssertion[]
}

export interface PlanUncertainty {
  stepIndex: number
  field: string
  question: string
  candidates: string[]
}

export interface WorkflowDraft {
  name: string
  description: string
  workflow: Workflow
  steps: PlanStep[]
  stepAssertions: Record<string, StepAssertion[]>
  acceptanceCriteria: StepAssertion[]
  assumptions: string[]
  uncertainties: PlanUncertainty[]
  plannerSource: 'llm' | 'rule'
}

export interface AgentPlanPayload {
  intent: AgentIntent
}

export interface AgentPlanResult {
  ok: boolean
  draft?: WorkflowDraft
  error?: string
}

/** 规划过程思考日志回调（主进程 → 渲染进程） */
export type PlanThinkEmitter = (payload:
  | { kind: 'info'; message: string }
  | { kind: 'stream'; delta: string }
  | { kind: 'stream_reset' }
) => void

// ── LLM 配置 ──────────────────────────────────────────────────────────────

export interface LlmSettings {
  apiKey?: string
  baseUrl: string
  model: string
  enabled: boolean
  /** 服务商预设 ID，见 shared/llm-providers.ts */
  providerId?: string
}

export {
  DEFAULT_LLM_PROVIDER_ID,
  LLM_PROVIDER_PRESETS,
  getLlmProviderPreset,
} from './llm-providers'
export type { LlmProviderPreset } from './llm-providers'

import { DEFAULT_LLM_PROVIDER_ID, getLlmProviderPreset } from './llm-providers'

const _defaultPreset = getLlmProviderPreset(DEFAULT_LLM_PROVIDER_ID)

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  providerId: DEFAULT_LLM_PROVIDER_ID,
  baseUrl: _defaultPreset.baseUrl,
  model: _defaultPreset.model,
  enabled: false,
}
