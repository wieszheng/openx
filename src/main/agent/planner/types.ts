export interface PlanStepAppliedPayload {
  stepIndex: number
  totalSteps: number
  step: import('../../../shared/agent').PlanStep
  node: import('../../../shared/workflow').WorkflowNode
  edge: import('../../../shared/workflow').WorkflowEdge
}

export interface PlanStreamInitPayload {
  workflowId: string
  name: string
  description: string
  triggerNode: import('../../../shared/workflow').WorkflowNode
}

export interface PlanEmitter {
  think?: import('../../../shared/agent').PlanThinkEmitter
  onStreamInit?: (payload: PlanStreamInitPayload) => void | Promise<void>
  onStepApplied?: (payload: PlanStepAppliedPayload) => void | Promise<void>
}
