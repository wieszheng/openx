import type { AgentIntent, WorkflowDraft } from '../../../shared/agent'
import { getLlmSettingsRaw } from '../../settings'
import { planWithLlm } from './llm-planner'
import { planWithRules } from './rule-planner'
import type { PlanEmitter } from './types'

export async function planWorkflow(
  intent: AgentIntent,
  emit?: PlanEmitter
): Promise<WorkflowDraft> {
  const cfg = getLlmSettingsRaw()
  const think = emit?.think

  if (cfg.enabled && cfg.apiKey) {
    think?.({ kind: 'info', message: `▶ 启用 LLM 编排 · 模型 ${cfg.model}` })
    think?.({ kind: 'stream_reset' })
    const llmDraft = await planWithLlm(intent, emit)
    if (llmDraft) return llmDraft
    think?.({ kind: 'info', message: '⚠ LLM 未返回有效结果，回退规则引擎…' })
  } else {
    think?.({ kind: 'info', message: '▶ 使用规则引擎解析用例（可在设置中配置 LLM）' })
  }

  return planWithRules(intent, emit)
}
