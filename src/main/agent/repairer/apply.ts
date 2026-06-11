import type { WorkflowPatch } from '../../../shared/agent'
import type { Workflow, WorkflowNode } from '../../../shared/workflow'
import type { WorkflowAdjEntry } from '../../workflow/executor'
import { buildWorkflowAdj } from '../../workflow/executor'

export function applyPatchesToWorkflow(workflow: Workflow, patches: WorkflowPatch[]): Workflow {
  const nodes = workflow.nodes.map((n) => ({ ...n, params: { ...n.params } }))
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  for (const patch of patches) {
    const node = nodeMap.get(patch.nodeId)
    if (!node) continue

    if (patch.op === 'update_params') {
      node.params = { ...node.params, ...patch.params } as WorkflowNode['params']
    } else if (patch.op === 'update_post_delay') {
      node.postDelayMs = patch.postDelayMs
    }
  }

  return {
    ...workflow,
    nodes: Array.from(nodeMap.values()),
    updatedAt: Date.now(),
  }
}

export function syncNodesMap(
  workflow: Workflow,
  nodes: Map<string, WorkflowNode>,
  adj: Map<string, WorkflowAdjEntry[]>
): void {
  nodes.clear()
  for (const n of workflow.nodes) {
    nodes.set(n.id, { ...n, params: { ...n.params } })
  }
  const newAdj = buildWorkflowAdj(workflow.edges)
  adj.clear()
  for (const [k, v] of newAdj) adj.set(k, v)
}
