import { useCallback, useState } from 'react'
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
import { useDevicesStore } from '@/stores/devices'
import { nodeTypes } from '@/components/workflow/node-types'
import { NodePanel } from '@/components/workflow/node-panel'
import { LogPanel } from '@/components/workflow/log-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Play, Square, Save, Plus, Trash2, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Workflow } from '../../../shared/workflow'

// ── Workflow List Sidebar ─────────────────────────────────────────────────

function WorkflowListSidebar({
  onClose,
}: {
  onClose: () => void
}) {
  const {
    workflows, activeWorkflowId,
    createWorkflow, deleteWorkflow, openWorkflow, renameWorkflow,
  } = useWorkflowStore()
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

  return (
    <div className="w-56 shrink-0 flex flex-col bg-card border-r border-border">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">工作流</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Create */}
      <div className="flex gap-1 px-2 py-2 border-b border-border">
        <Input
          className="h-7 text-xs flex-1"
          placeholder="工作流名称"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <Button size="icon" className="h-7 w-7 shrink-0" onClick={handleCreate}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {workflows.length === 0 && (
          <p className="text-xs text-muted-foreground px-3 py-4">还没有工作流，点击上方 + 创建</p>
        )}
        {workflows.map((w) => (
          <div
            key={w.id}
            className={cn(
              'group flex items-center gap-1 px-2 py-1.5 mx-1 rounded-lg cursor-pointer transition-all',
              activeWorkflowId === w.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
            )}
            onClick={() => openWorkflow(w.id)}
          >
            {editingId === w.id ? (
              <Input
                autoFocus
                className="h-6 text-xs flex-1"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => { if (e.key === 'Enter') commitEdit() }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="text-xs font-medium flex-1 truncate"
                onDoubleClick={(e) => { e.stopPropagation(); startEdit(w) }}
              >
                {w.name}
              </span>
            )}
            <Button
              variant="ghost" size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 text-destructive"
              onClick={(e) => { e.stopPropagation(); deleteWorkflow(w.id) }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Toolbar ───────────────────────────────────────────────────────────────

function Toolbar({ showList, onToggleList }: { showList: boolean; onToggleList: () => void }) {
  const {
    activeWorkflowId, workflows, runStatus,
    saveActiveWorkflow, startRun, finishRun, appendLog, clearLogs,
    rfNodes, rfEdges,
  } = useWorkflowStore()
  
  const { devices, selectedId } = useDevicesStore()
  const selectedDevice = devices.find((d) => d.id === selectedId)

  const workflow = workflows.find((w) => w.id === activeWorkflowId)
  const isRunning = runStatus === 'running'

  async function handleRun() {
    if (!workflow) { toast.error('请先打开一个工作流'); return }
    if (!selectedDevice) { toast.error('请先选择设备'); return }
    if (isRunning) return

    // Save first
    saveActiveWorkflow()

    // Rebuild workflow from current RF state
    const runWorkflow: Workflow = {
      ...workflow,
      nodes: rfNodes.map((n) => ({
        id: n.id,
        type: n.type as Workflow['nodes'][0]['type'],
        label: (n.data.label as string) ?? n.type ?? '',
        params: (n.data.params ?? {}) as Workflow['nodes'][0]['params'],
        position: n.position,
      })),
      edges: rfEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
      })),
    }

    clearLogs()
    startRun()

    // Subscribe to events
    const unsubLog = window.api?.workflow?.onLog((log) => appendLog(log)) ?? (() => {})
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
      deviceId: selectedDevice.id,
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

  function handleSave() {
    saveActiveWorkflow()
    toast.success('已保存')
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
      {/* Toggle list */}
      <Button
        variant="ghost" size="sm"
        className="h-7 px-2 text-xs"
        onClick={onToggleList}
      >
        {showList ? <ChevronRight className="h-3.5 w-3.5 rotate-180" /> : <ChevronRight className="h-3.5 w-3.5" />}
        工作流列表
      </Button>

      <div className="h-4 w-px bg-border mx-1" />

      {/* Current workflow name */}
      <span className="text-sm font-semibold text-foreground truncate max-w-[160px]">
        {workflow?.name ?? '未选择工作流'}
      </span>

      <div className="flex-1" />

      {/* Device selector display */}
      {selectedDevice ? (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md max-w-[160px] truncate">
          📱 {selectedDevice.displayName}
        </span>
      ) : (
        <span className="text-xs text-destructive">⚠ 未选择设备</span>
      )}

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
  )
}

// ── Main Canvas ───────────────────────────────────────────────────────────

function WorkflowCanvas() {
  const {
    rfNodes, rfEdges, setRfNodes, setRfEdges,
    setSelectedNodeId, selectedNodeId, runStatus, logs,
    activeWorkflowId,
  } = useWorkflowStore()

  // Sync step status from logs onto node data
  const nodesWithStatus = rfNodes.map((node) => {
    const nodeLog = [...logs].reverse().find((l) => l.nodeId === node.id)
    return {
      ...node,
      data: { ...node.data, stepStatus: nodeLog?.status ?? undefined },
      selected: node.id === selectedNodeId,
    }
  })

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
      const newEdge: Edge = { ...connection, id: nanoid(), type: 'smoothstep', animated: runStatus === 'running' }
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

  if (!activeWorkflowId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="text-5xl">⚡</div>
        <p className="text-base font-semibold">请从左侧「工作流列表」选择或新建一个工作流</p>
        <p className="text-sm">然后拖入节点，连接它们，点击运行！</p>
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodesWithStatus}
      edges={rfEdges.map((e) => ({ ...e, animated: runStatus === 'running' }))}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: 'smoothstep' }}
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
  const [showList, setShowList] = useState(true)

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <Toolbar showList={showList} onToggleList={() => setShowList((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        {showList && (
          <WorkflowListSidebar onClose={() => setShowList(false)} />
        )}

        {/* Node panel (requires ReactFlowProvider from parent) */}
        <NodePanel />

        {/* Canvas */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-l border-border">
          <div className="flex-1 overflow-hidden relative bg-card/50">
            <WorkflowCanvas />
          </div>
          <LogPanel height={200} />
        </div>
      </div>
    </div>
  )
}
