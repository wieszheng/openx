import type { AgentEvent, AgentSessionSnapshot } from '../../shared/agent'

let snapshot: AgentSessionSnapshot = {
  status: 'idle',
  mode: 'auto',
  execution: { checkpoints: [], completedNodeIds: [] },
}

export function getAgentSessionSnapshot(): AgentSessionSnapshot {
  return snapshot
}

export function resetAgentSession(payload: {
  workflowId: string
  workflowName: string
  deviceId?: string
  mode: AgentSessionSnapshot['mode']
}): void {
  snapshot = {
    status: 'running',
    mode: payload.mode,
    workflowId: payload.workflowId,
    workflowName: payload.workflowName,
    execution: { deviceId: payload.deviceId, checkpoints: [], completedNodeIds: [] },
  }
}

export function updateAgentSnapshotFromEvent(event: AgentEvent): void {
  if (event.type === 'status') {
    snapshot = { ...snapshot, status: event.status, mode: event.mode ?? snapshot.mode }
  } else if (event.type === 'step_end') {
    snapshot = {
      ...snapshot,
      execution: {
        ...snapshot.execution,
        currentNodeId: event.checkpoint.nodeId,
        failedNodeId: event.checkpoint.ok ? undefined : event.checkpoint.nodeId,
        checkpoints: [...snapshot.execution.checkpoints, event.checkpoint],
        completedNodeIds: event.checkpoint.ok
          ? [...snapshot.execution.completedNodeIds, event.checkpoint.nodeId]
          : snapshot.execution.completedNodeIds,
      },
    }
  } else if (event.type === 'done') {
    snapshot = {
      ...snapshot,
      status: event.summary.status === 'done' ? 'done' : event.summary.status === 'stopped' ? 'stopped' : 'failed',
      execution: {
        ...snapshot.execution,
        failedNodeId: event.summary.failedNodeId,
      },
    }
  }
}

export function markAgentStopped(): void {
  snapshot = { ...snapshot, status: 'stopped' }
}
