import type { AgentIntent, PlanStep, PlanUncertainty, PlanThinkEmitter, StepAssertion } from '../../../shared/agent'
import type { WorkflowNodeType } from '../../../shared/workflow'
import { getDevicesSnapshot } from '../../devices'
import { streamCompleteJson } from '../llm/provider'
import { buildWorkflowFromStepsStreaming } from './build'
import type { PlanEmitter } from './types'

const NODE_TYPES: WorkflowNodeType[] = [
  'trigger-manual', 'action-screenshot', 'action-tap', 'action-double-tap',
  'action-long-click', 'action-swipe', 'action-drag', 'action-input-text',
  'action-clear-text', 'action-key-event', 'action-install-app', 'action-uninstall-app',
  'action-launch-app', 'action-close-app', 'action-find-and-tap', 'action-shell',
  'action-get-var', 'action-set-var', 'control-if', 'control-loop', 'control-delay',
]

const NODE_PICK_HINT: Partial<Record<WorkflowNodeType, string>> = {
  'action-find-and-tap': 'OCR 定位，跨分辨率更稳',
  'action-tap': '仅当 OCR 不可用时使用坐标',
  'action-launch-app': '冷启动应用入口',
  'control-delay': '页面跳转/动画缓冲',
  'action-input-text': '文本输入到焦点控件',
  'action-key-event': '系统按键（返回/Home 等）',
}

interface LlmPlanResponse {
  name: string
  description: string
  assumptions?: string[]
  acceptance?: StepAssertion[]
  uncertainties?: PlanUncertainty[]
  steps: {
    intent: string
    type: WorkflowNodeType
    label: string
    params: Record<string, unknown>
    postDelayMs?: number
    assertions?: StepAssertion[]
  }[]
}

function buildSystemPrompt(): string {
  return `你是 OpenX 移动端自动化测试工作流规划器。根据用户用例描述，生成 Android/HarmonyOS 设备自动化步骤。

规则：
1. 优先使用 action-find-and-tap（OCR 文字定位）而非 action-tap（坐标）
2. 页面跳转后加 control-delay 1500-3000ms
3. 启动应用用 action-launch-app，包名不确定时写入 uncertainties
4. 验证 UI 文案用 action-find-and-tap + action=assert，或单独步骤断言
5. 步骤类型只能是：${NODE_TYPES.join(', ')}
6. 输出严格 JSON，不要 markdown

JSON 格式：
{
  "name": "工作流名称",
  "description": "描述",
  "assumptions": ["假设"],
  "acceptance": [{ "type": "ocr_contains", "value": "最终验收文字" }],
  "uncertainties": [{ "stepIndex": 0, "field": "packageName", "question": "问题", "candidates": ["候选"] }],
  "steps": [{
    "intent": "步骤意图",
    "type": "action-find-and-tap",
    "label": "节点标签",
    "params": { "targetText": "文字", "matchType": "contains", "action": "tap" },
    "postDelayMs": 2000,
    "assertions": [{ "type": "ocr_contains", "value": "期望文字" }]
  }]
}`
}

function buildContext(intent: AgentIntent): string {
  const device = intent.deviceId
    ? getDevicesSnapshot().find((d) => d.id === intent.deviceId)
    : undefined
  const parts = [`用例描述：${intent.description}`]
  if (device) {
    parts.push(`设备平台：${device.platform}`)
    parts.push(`设备名称：${device.displayName}`)
  }
  return parts.join('\n')
}

function describeLlmStep(step: PlanStep, index: number, total: number, think?: PlanThinkEmitter): void {
  think?.({ kind: 'info', message: `◆ [${index + 1}/${total}] ${step.label}` })
  think?.({ kind: 'info', message: `    意图: ${step.intent}` })
  think?.({ kind: 'info', message: `    节点: ${step.type} — ${NODE_PICK_HINT[step.type] ?? '标准动作节点'}` })
  const p = step.params as Record<string, unknown>
  if (p.targetText) think?.({ kind: 'info', message: `    OCR 目标: 「${p.targetText}」` })
  if (p.packageName) think?.({ kind: 'info', message: `    包名: ${p.packageName || '(待填)'}` })
  if (p.text) think?.({ kind: 'info', message: `    输入: ${p.text}` })
  if (step.postDelayMs) think?.({ kind: 'info', message: `    延迟: ${step.postDelayMs}ms` })
  if (step.assertions?.length) {
    think?.({ kind: 'info', message: `    断言: ${step.assertions.map((a) => a.value).join(', ')}` })
  }
}

export async function planWithLlm(intent: AgentIntent, emit?: PlanEmitter) {
  const think = emit?.think

  think?.({ kind: 'info', message: '▶ LLM 编排 · 分析用例意图' })
  think?.({ kind: 'info', message: `◆ 用例摘要: ${intent.description.slice(0, 80)}${intent.description.length > 80 ? '…' : ''}` })

  const device = intent.deviceId
    ? getDevicesSnapshot().find((d) => d.id === intent.deviceId)
    : undefined
  if (device) {
    think?.({ kind: 'info', message: `◆ 设备上下文: ${device.displayName} (${device.platform})` })
    think?.({ kind: 'info', message: '    将优先考虑平台兼容的节点与等待策略' })
  }

  think?.({ kind: 'info', message: '◆ 请求 LLM 生成结构化 JSON…' })
  think?.({ kind: 'stream_reset' })

  const response = await streamCompleteJson<LlmPlanResponse>(
    [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildContext(intent) },
    ],
    (delta) => think?.({ kind: 'stream', delta })
  )

  think?.({ kind: 'info', message: '◆ LLM 响应完成，校验 JSON 结构…' })

  if (!response?.steps?.length) {
    think?.({ kind: 'info', message: '✗ 未能解析出有效步骤' })
    return null
  }

  think?.({ kind: 'info', message: `◆ 工作流名称: ${response.name || 'AI 生成工作流'}` })
  if (response.assumptions?.length) {
    think?.({ kind: 'info', message: `◆ LLM 假设 (${response.assumptions.length}):` })
    response.assumptions.forEach((a) => think?.({ kind: 'info', message: `    · ${a}` }))
  }

  const steps: PlanStep[] = response.steps.map((s) => ({
    intent: s.intent,
    type: s.type,
    label: s.label,
    params: s.params as PlanStep['params'],
    postDelayMs: s.postDelayMs,
    assertions: s.assertions,
  }))

  think?.({ kind: 'info', message: `◆ 映射 ${steps.length} 步到 OpenX 节点类型` })
  steps.forEach((s, i) => describeLlmStep(s, i, steps.length, think))

  if (response.uncertainties?.length) {
    think?.({ kind: 'info', message: `◆ ${response.uncertainties.length} 项待用户在画布中确认:` })
    response.uncertainties.forEach((u) => think?.({ kind: 'info', message: `    ? ${u.question}` }))
  }

  if (response.acceptance?.length) {
    think?.({ kind: 'info', message: `◆ 验收标准: ${response.acceptance.map((a) => a.value).join('、')}` })
  }

  think?.({ kind: 'info', message: '◆ 开始流式写入画布…' })

  const name = response.name || 'AI 生成工作流'
  const description = response.description || intent.description

  return buildWorkflowFromStepsStreaming(
    name,
    description,
    steps,
    {
      assumptions: response.assumptions ?? [],
      uncertainties: response.uncertainties ?? [],
      plannerSource: 'llm',
      acceptanceCriteria: response.acceptance ?? [],
    },
    async (payload) => emit?.onStepApplied?.(payload),
    think,
    120,
    emit?.onStreamInit
  )
}
