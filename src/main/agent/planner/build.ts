import type { PlanStep, StepAssertion, WorkflowDraft } from '../../../shared/agent'
import { StreamingWorkflowBuilder, sleep } from './streaming-builder'
import type { PlanEmitter, PlanStepAppliedPayload, PlanStreamInitPayload } from './types'

export { StreamingWorkflowBuilder, emitStepThink, sleep } from './streaming-builder'
export type { PlanEmitter, PlanStepAppliedPayload, PlanStreamInitPayload } from './types'

export async function buildWorkflowFromStepsStreaming(
  name: string,
  description: string,
  steps: PlanStep[],
  meta: {
    assumptions: string[]
    uncertainties: WorkflowDraft['uncertainties']
    plannerSource: WorkflowDraft['plannerSource']
    acceptanceCriteria?: StepAssertion[]
  },
  onStep?: (payload: PlanStepAppliedPayload) => void | Promise<void>,
  think?: PlanEmitter['think'],
  stepDelayMs = 120,
  onStreamInit?: (payload: PlanStreamInitPayload) => void | Promise<void>
): Promise<WorkflowDraft> {
  const builder = new StreamingWorkflowBuilder(name, description)

  think?.({ kind: 'info', message: `◆ 初始化工作流「${name}」` })
  think?.({ kind: 'info', message: `◆ 布局: 横向排列 · 共 ${steps.length} 步` })

  onStreamInit?.({
    workflowId: builder.workflowIdValue,
    name,
    description,
    triggerNode: builder.getTriggerNode(),
  })

  for (const step of steps) {
    await builder.addStep(step, onStep, think)
    if (stepDelayMs > 0) await sleep(stepDelayMs)
  }

  think?.({ kind: 'info', message: `◆ 连接 ${builder.edgeCount} 条边 · 串行 DAG（横向布局）` })

  return builder.finalize(meta)
}

/** @deprecated 使用 buildWorkflowFromStepsStreaming */
export function buildWorkflowFromSteps(
  name: string,
  description: string,
  steps: PlanStep[],
  meta: Parameters<typeof buildWorkflowFromStepsStreaming>[3]
): WorkflowDraft {
  const builder = new StreamingWorkflowBuilder(name, description)
  for (const step of steps) {
    void builder.addStep(step)
  }
  return builder.finalize(meta)
}
