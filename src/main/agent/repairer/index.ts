import type { Checkpoint, FailureReport, RepairProposal } from '../../../shared/agent'
import type { Workflow, WorkflowNode } from '../../../shared/workflow'
import { classifyFailure } from './classify'
import { diagnoseFailure } from './diagnose'

export { applyPatchesToWorkflow, syncNodesMap } from './apply'
export { classifyFailure } from './classify'
export { diagnoseFailure } from './diagnose'

export function buildFailureReport(
  node: WorkflowNode,
  checkpoint: Checkpoint,
  isAssertion = false
): FailureReport {
  return classifyFailure(node, checkpoint, isAssertion)
}

export function proposeRepair(
  failure: FailureReport,
  node: WorkflowNode,
  workflow: Workflow,
  isAssertion = false
): RepairProposal | null {
  return diagnoseFailure(failure, node, workflow, isAssertion)
}
