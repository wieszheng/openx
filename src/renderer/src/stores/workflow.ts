import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type {
  Workflow,
  ExecutionLog,
  ExecutionStatus,
} from '../../../shared/workflow'
import type { Node, Edge } from '@xyflow/react'

// ── 持久化到 localStorage ──────────────────────────────────────────────

const STORAGE_KEY = 'openx:workflows'

function loadWorkflows(): Workflow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Workflow[]) : []
  } catch {
    return []
  }
}

function saveWorkflows(workflows: Workflow[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows))
}

// ── Store Types ───────────────────────────────────────────────────────────

interface WorkflowStore {
  // 工作流列表
  workflows: Workflow[]
  // 当前正在编辑的工作流
  activeWorkflowId: string | null
  // React Flow nodes/edges（与 activeWorkflow 同步）
  rfNodes: Node[]
  rfEdges: Edge[]
  // 执行状态
  runStatus: ExecutionStatus
  logs: ExecutionLog[]
  nodeImages: Record<string, string>  // nodeId → data URL，截图节点执行后缓存
  // 选中的节点 id（用于配置面板）
  selectedNodeId: string | null

  // Actions
  createWorkflow: (name: string) => void
  deleteWorkflow: (id: string) => void
  openWorkflow: (id: string) => void
  saveActiveWorkflow: () => void
  renameWorkflow: (id: string, name: string) => void

  setRfNodes: (nodes: Node[]) => void
  setRfEdges: (edges: Edge[]) => void
  updateNodeParams: (nodeId: string, params: Record<string, unknown>) => void
  updateNodeLabel: (nodeId: string, label: string) => void
  updateNodePostDelay: (nodeId: string, ms: number | undefined) => void
  updateNodeStepStatus: (nodeId: string, status: 'running' | 'success' | 'error' | null) => void
  updateNodeImageData: (nodeId: string, dataUrl: string) => void
  clearNodeStepStatuses: () => void

  setSelectedNodeId: (id: string | null) => void

  // Execution
  startRun: () => void
  appendLog: (log: ExecutionLog) => void
  finishRun: (status: ExecutionStatus) => void
  clearLogs: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────

function workflowToRf(workflow: Workflow): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = workflow.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { label: n.label, params: n.params, nodeType: n.type, postDelayMs: n.postDelayMs },
  }))
  const edges: Edge[] = workflow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: 'default',
    animated: false,
  }))
  return { nodes, edges }
}

function rfToWorkflow(
  workflow: Workflow,
  rfNodes: Node[],
  rfEdges: Edge[]
): Workflow {
  return {
    ...workflow,
    nodes: rfNodes.map((n) => ({
      id: n.id,
      type: n.type as Workflow['nodes'][0]['type'],
      label: (n.data.label as string) ?? n.type,
      params: (n.data.params as Workflow['nodes'][0]['params']) ?? {},
      position: n.position,
      postDelayMs: (n.data.postDelayMs as number | undefined) || undefined,
    })),
    edges: rfEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
    })),
    updatedAt: Date.now(),
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: loadWorkflows(),
  activeWorkflowId: null,
  rfNodes: [],
  rfEdges: [],
  runStatus: 'idle',
  logs: [],
  nodeImages: {},
  selectedNodeId: null,

  createWorkflow: (name) => {
    const now = Date.now()
    const workflow: Workflow = {
      id: nanoid(),
      name,
      nodes: [
        {
          id: nanoid(),
          type: 'trigger-manual',
          label: '手动触发',
          params: {},
          position: { x: 200, y: 100 },
        },
      ],
      edges: [],
      createdAt: now,
      updatedAt: now,
    }
    const workflows = [...get().workflows, workflow]
    saveWorkflows(workflows)
    const { nodes: rfNodes, edges: rfEdges } = workflowToRf(workflow)
    set({ workflows, activeWorkflowId: workflow.id, rfNodes, rfEdges })
  },

  deleteWorkflow: (id) => {
    const workflows = get().workflows.filter((w) => w.id !== id)
    saveWorkflows(workflows)
    if (get().activeWorkflowId === id) {
      set({ workflows, activeWorkflowId: null, rfNodes: [], rfEdges: [] })
    } else {
      set({ workflows })
    }
  },

  openWorkflow: (id) => {
    const workflow = get().workflows.find((w) => w.id === id)
    if (!workflow) return
    const { nodes: rfNodes, edges: rfEdges } = workflowToRf(workflow)
    set({ activeWorkflowId: id, rfNodes, rfEdges, logs: [], runStatus: 'idle', selectedNodeId: null })
  },

  saveActiveWorkflow: () => {
    const { activeWorkflowId, workflows, rfNodes, rfEdges } = get()
    if (!activeWorkflowId) return
    const workflow = workflows.find((w) => w.id === activeWorkflowId)
    if (!workflow) return
    const updated = rfToWorkflow(workflow, rfNodes, rfEdges)
    const newWorkflows = workflows.map((w) => (w.id === activeWorkflowId ? updated : w))
    saveWorkflows(newWorkflows)
    set({ workflows: newWorkflows })
  },

  renameWorkflow: (id, name) => {
    const workflows = get().workflows.map((w) =>
      w.id === id ? { ...w, name, updatedAt: Date.now() } : w
    )
    saveWorkflows(workflows)
    set({ workflows })
  },

  setRfNodes: (rfNodes) => set({ rfNodes }),
  setRfEdges: (rfEdges) => set({ rfEdges }),

  updateNodeParams: (nodeId, params) => {
    const rfNodes = get().rfNodes.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, params: { ...(n.data.params as object), ...params } } } : n
    )
    set({ rfNodes })
  },

  updateNodeLabel: (nodeId, label) => {
    const rfNodes = get().rfNodes.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
    )
    set({ rfNodes })
  },

  updateNodePostDelay: (nodeId, ms) => {
    const rfNodes = get().rfNodes.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, postDelayMs: ms } } : n
    )
    set({ rfNodes })
  },

  updateNodeStepStatus: (nodeId, status) => {
    const rfNodes = get().rfNodes.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, stepStatus: status ?? undefined } } : n
    )
    set({ rfNodes })
  },

  updateNodeImageData: (nodeId, dataUrl) => {
    set((s) => ({ nodeImages: { ...s.nodeImages, [nodeId]: dataUrl } }))
  },

  clearNodeStepStatuses: () => {
    const rfNodes = get().rfNodes.map((n) => {
      const { stepStatus: _, ...rest } = n.data as Record<string, unknown>
      return { ...n, data: rest }
    })
    set({ rfNodes })
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  startRun: () => {
    get().clearNodeStepStatuses()
    set({ runStatus: 'running', logs: [], nodeImages: {} })
  },
  appendLog: (log) => set((s) => ({ logs: [...s.logs, log] })),
  finishRun: (status) => {
    set({ runStatus: status })
    setTimeout(() => get().clearNodeStepStatuses(), 3000)
  },
  clearLogs: () => set({ logs: [] }),
}))
