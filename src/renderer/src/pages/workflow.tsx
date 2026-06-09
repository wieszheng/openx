import { useCallback, useMemo, useState } from 'react'
import { getBaseUrl } from '@/lib/settings'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeChange,
  type EdgeChange,
  type Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nanoid } from 'nanoid'
import { useWorkflowStore } from '@/stores/workflow'
import { useReactFlow } from '@xyflow/react'
import { useDevicesStore } from '@/stores/devices'
import { nodeTypes } from '@/components/workflow/node-types'
import { NodePanel } from '@/components/workflow/node-panel'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Play, Square, Save, Plus, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Workflow } from '../../../shared/workflow'

// ── Workflow Header (Card) ──────────────────────────────────────────────────

function WorkflowHeader() {
  const {
    workflows, activeWorkflowId, runStatus,
    createWorkflow, deleteWorkflow, openWorkflow, renameWorkflow,
    saveActiveWorkflow, startRun, finishRun, updateNodeStepStatus, updateNodeImageData,
    rfNodes, rfEdges,
  } = useWorkflowStore()

  const selectedId = useDevicesStore((s) => s.selectedId)

  const workflow = workflows.find((w) => w.id === activeWorkflowId)
  const isRunning = runStatus === 'running'

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  function handleCreate() {
    const name = newName.trim() || `工作流 ${workflows.length + 1}`
    createWorkflow(name)
    setNewName('')
  }

  function startEdit(w: Workflow) {
    setEditingId(w.id)
    setEditName(w.name)
  }

  function commitEdit() {
    if (editingId && editName.trim()) {
      renameWorkflow(editingId, editName.trim())
    }
    setEditingId(null)
  }

  function handleSave() {
    saveActiveWorkflow()
    toast.success('已保存')
  }

  async function handleRun() {
    if (!workflow) { toast.error('请先打开一个工作流'); return }
    if (isRunning) return

    saveActiveWorkflow()

    const runWorkflow: Workflow = {
      ...workflow,
      nodes: rfNodes.map((n) => ({
        id: n.id,
        type: n.type as Workflow['nodes'][0]['type'],
        label: (n.data.label as string) ?? n.type ?? '',
        params: (n.data.params ?? {}) as Workflow['nodes'][0]['params'],
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
    }

    startRun()

    const unsubLog = window.api?.workflow?.onLog((log) => {
      if (log.status === 'running' || log.status === 'success' || log.status === 'error') {
        updateNodeStepStatus(log.nodeId, log.status)
      }
      if (log.imageData) {
        updateNodeImageData(log.nodeId, log.imageData)
      }
    }) ?? (() => {})

    const unsubDone = window.api?.workflow?.onDone((result) => {
      unsubLog()
      unsubDone()
      finishRun(result.status === 'done' ? 'done' : result.status === 'stopped' ? 'stopped' : 'error')
      if (result.status === 'done') toast.success('工作流执行完成')
      else if (result.status === 'stopped') toast.info('已停止执行')
      else toast.error(`执行出错: ${result.error ?? '未知错误'}`)
    }) ?? (() => {})

    const res = await window.api?.workflow?.run({
      workflow: runWorkflow,
      deviceId: selectedId ?? undefined,
      baseUrl: getBaseUrl(),
    })

    if (!res || !res.ok) {
      unsubLog()
      unsubDone()
      finishRun('error')
      toast.error(res?.error ?? '启动失败')
    }
  }

  function handleStop() {
    window.api?.workflow?.stop()
  }

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 min-w-0">
        {/* Workflow label */}
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground shrink-0">
          工作流
        </span>

        {/* Workflow tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {workflows.length === 0 && (
            <span className="text-xs text-muted-foreground shrink-0">暂无工作流</span>
          )}

          {workflows.map((w) => (
            <div
              key={w.id}
              className={cn(
                'group flex items-center gap-1 px-2.5 py-1 rounded-md cursor-pointer transition-all shrink-0',
                activeWorkflowId === w.id
                  ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                  : 'hover:bg-accent'
              )}
              onClick={() => openWorkflow(w.id)}
            >
              {editingId === w.id ? (
                <Input
                  autoFocus
                  className="h-6 w-28 text-xs"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit() }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="text-xs font-medium truncate max-w-[120px]"
                  onDoubleClick={(e) => { e.stopPropagation(); startEdit(w) }}
                >
                  {w.name}
                </span>
              )}
              <Button
                variant="ghost" size="icon"
                className="h-4 w-4 opacity-0 group-hover:opacity-100 shrink-0 text-destructive"
                onClick={(e) => { e.stopPropagation(); deleteWorkflow(w.id) }}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Create new */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <Input
            className="h-7 w-28 text-xs"
            placeholder="新建"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button size="icon" className="h-7 w-7 shrink-0" onClick={handleCreate}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <Button
          variant="outline" size="sm" className="h-7 px-3 text-xs gap-1.5"
          onClick={handleSave}
          disabled={!activeWorkflowId || isRunning}
        >
          <Save className="h-3.5 w-3.5" />
          保存
        </Button>

        {!isRunning ? (
          <Button
            size="sm" className="h-7 px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={handleRun}
            disabled={!activeWorkflowId}
          >
            <Play className="h-3.5 w-3.5" />
            运行
          </Button>
        ) : (
          <Button
            size="sm" variant="destructive" className="h-7 px-3 text-xs gap-1.5"
            onClick={handleStop}
          >
            <Square className="h-3.5 w-3.5" />
            停止
          </Button>
        )}
      </div>
    </Card>
  )
}

// ── Main Canvas ───────────────────────────────────────────────────────────

function WorkflowCanvas() {
  const {
    rfNodes, rfEdges, setRfNodes, setRfEdges,
    setSelectedNodeId, selectedNodeId, runStatus,
    activeWorkflowId,
  } = useWorkflowStore()
  const { screenToFlowPosition } = useReactFlow()
  const disabled = runStatus === 'running' || !activeWorkflowId

  const nodesWithStatus = rfNodes.map((node) => ({
    ...node,
    selected: node.id === selectedNodeId,
  }))

  // Derive per-edge styles from target node's stepStatus
  const edgesWithStatus = useMemo(() => {
    const statusMap = new Map<string, string>()
    rfNodes.forEach((n) => {
      const s = (n.data as Record<string, unknown>).stepStatus as string | undefined
      if (s) statusMap.set(n.id, s)
    })

    // 条件/循环分支边的静态标签配置
    const HANDLE_LABEL: Record<string, { text: string; color: string; bg: string }> = {
      'yes':       { text: '是',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
      'no':        { text: '否',    color: '#f43f5e', bg: 'rgba(244,63,94,0.10)' },
      'loop-body': { text: '循环体', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
      'loop-done': { text: '完成',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    }

    return rfEdges.map((e) => {
      const ts = statusMap.get(e.target)
      const hl = e.sourceHandle ? HANDLE_LABEL[e.sourceHandle] : null

      const labelProps = hl ? {
        label: hl.text,
        labelStyle: { fontSize: 10, fontWeight: 700, fill: hl.color },
        labelBgStyle: { fill: hl.bg, stroke: hl.color, strokeOpacity: 0.3 },
        labelBgPadding: [5, 2] as [number, number],
        labelBgBorderRadius: 4,
      } : {}

      if (ts === 'running') return { ...e, ...labelProps, animated: true,  style: { stroke: '#6366f1', strokeWidth: 2.5 } }
      if (ts === 'success') return { ...e, ...labelProps, animated: false, style: { stroke: '#10b981', strokeWidth: 2 } }
      if (ts === 'error')   return { ...e, ...labelProps, animated: false, style: { stroke: '#ef4444', strokeWidth: 2 } }
      return { ...e, ...labelProps, animated: false, style: { stroke: hl?.color ?? '#94a3b8', strokeWidth: 1.5, strokeDasharray: '5 4' } }
    })
  }, [rfNodes, rfEdges])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setRfNodes(applyNodeChanges(changes, rfNodes) as Node[]),
    [rfNodes, setRfNodes]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setRfEdges(applyEdgeChanges(changes, rfEdges) as Edge[]),
    [rfEdges, setRfEdges]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = { ...connection, id: nanoid(), type: 'default', animated: runStatus === 'running' }
      setRfEdges(addEdge(newEdge, rfEdges) as Edge[])
    },
    [rfEdges, setRfEdges, runStatus]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }, [setSelectedNodeId])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [setSelectedNodeId])

  // Drag and drop from node panel
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/reactflow-type')
    if (!type || disabled) return

    const label = event.dataTransfer.getData('application/reactflow-label') || type
    const paramsStr = event.dataTransfer.getData('application/reactflow-params') || '{}'

    const position = screenToFlowPosition({ x: event.clientX - 80, y: event.clientY })
    const newNode = {
      id: nanoid(),
      type,
      position,
      data: { label, nodeType: type, params: JSON.parse(paramsStr), postDelayMs: type.startsWith('trigger-') ? undefined : 2000 },
    }
    setRfNodes([...rfNodes, newNode])
  }, [screenToFlowPosition, rfNodes, setRfNodes, disabled])

  if (!activeWorkflowId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="text-5xl">⚡</div>
        <p className="text-base font-semibold">请从顶部「工作流」列表选择或新建一个工作流</p>
        <p className="text-sm">然后拖入节点，连接它们，点击运行！</p>
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodesWithStatus}
      edges={edgesWithStatus}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      fitView
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: 'default' }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <Controls />
      <MiniMap
        className="!bg-card !border !border-border !rounded-xl"
        nodeColor={(n) => {
          const type = n.type ?? ''
          if (type.startsWith('trigger')) return '#10b981'
          if (type.startsWith('action')) return '#3b82f6'
          return '#ec4899'
        }}
      />
    </ReactFlow>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────

export function WorkflowPage() {
  return (
    <div className="flex h-full flex-col space-y-2">
      {/* Top: Workflow list & actions (Card style, matching automation-page) */}
      <WorkflowHeader />

      {/* Main area: node library + canvas (matching automation-page border pattern) */}
      <div className="flex flex-1 overflow-hidden rounded-xl border bg-muted/20">
        {/* Node panel (requires ReactFlowProvider from parent) */}
        <NodePanel />

        {/* Canvas */}
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0">
            <WorkflowCanvas />
          </div>
        </div>
      </div>
    </div>
  )
}
