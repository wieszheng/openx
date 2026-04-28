import { useMemo, useState, useCallback, useRef } from "react"
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  DatabaseZap,
  Fingerprint,
  GripVertical,
  MousePointer2,
  Move,
  Play,
  Save,
  ScanSearch,
  Search,
  Settings,
  Sparkles,
  Type,
  Webhook,
  Workflow,
  X,
} from "lucide-react"
import {
  addEdge,
  Background,
  MarkerType,
  MiniMap,
  Panel,
  type Connection,
  type Edge,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { nodeTypes } from "./automation/nodes/node-registry"
import { ConfigPanel } from "./automation/nodes/config-panel"
import { useTheme } from "@/components/theme-provider"
import {
  CATEGORY_STYLES,
  NODE_KIND_TO_CATEGORY,
  type AnyNodeData,
  type NodeKind,
} from "./automation/nodes/types"

// ─── 模板类型 ─────────────────────────────────────────────────────────────────

type NodeTemplate = {
  name: string
  nodeKind: NodeKind
  icon: React.ComponentType<{ className?: string }>
}

type NodeGroup = {
  name: string
  groupKind: NodeKind   // representative kind for color lookup
  items: NodeTemplate[]
}

// ─── 节点库数据 ───────────────────────────────────────────────────────────────

const nodeGroups: NodeGroup[] = [
  {
    name: "触发器",
    groupKind: "webhookTrigger",
    items: [
      { name: "Webhook 触发器", nodeKind: "webhookTrigger", icon: Webhook },
    ],
  },
  {
    name: "APP UI 操作",
    groupKind: "uiClick",
    items: [
      { name: "启动应用", nodeKind: "appLaunch",     icon: Play },
      { name: "关闭应用", nodeKind: "appClose",      icon: X },
      { name: "点击",     nodeKind: "uiClick",       icon: MousePointer2 },
      { name: "双击",     nodeKind: "uiDoubleClick", icon: Fingerprint },
      { name: "滑动",     nodeKind: "uiSwipe",       icon: Move },
      { name: "文本输入", nodeKind: "uiInput",       icon: Type },
      { name: "等待元素", nodeKind: "uiWait",        icon: Clock3 },
    ],
  },
  {
    name: "接口请求",
    groupKind: "apiHttp",
    items: [
      { name: "HTTP 请求", nodeKind: "apiHttp",   icon: Activity },
      { name: "结果通知",  nodeKind: "apiNotify", icon: Sparkles },
    ],
  },
  {
    name: "数据操作",
    groupKind: "dbQuery",
    items: [
      { name: "SQL 查询", nodeKind: "dbQuery",   icon: Database },
      { name: "SQL 执行", nodeKind: "dbExecute", icon: DatabaseZap },
    ],
  },
  {
    name: "断言",
    groupKind: "assertText",
    items: [
      { name: "断言文本",     nodeKind: "assertText",   icon: CheckCircle2 },
      { name: "断言元素存在", nodeKind: "assertExists", icon: ScanSearch },
      { name: "AI 分析",     nodeKind: "assertAI",     icon: Bot },
    ],
  },
]

// ─── 初始节点数据工厂 ─────────────────────────────────────────────────────────

function buildNodeData(template: NodeTemplate): AnyNodeData {
  const base = { label: template.name, status: "待配置" as const }
  switch (template.nodeKind) {
    case "webhookTrigger":
      return { ...base, kind: "webhookTrigger", webhookUrl: "" }
    case "appLaunch":
      return { ...base, kind: "appLaunch", packageName: "" }
    case "appClose":
      return { ...base, kind: "appClose", packageName: "" }
    case "uiClick":
      return { ...base, kind: "uiClick", selector: "" }
    case "uiDoubleClick":
      return { ...base, kind: "uiDoubleClick", selector: "" }
    case "uiSwipe":
      return { ...base, kind: "uiSwipe", direction: "down", duration: 500 }
    case "uiInput":
      return { ...base, kind: "uiInput", selector: "", inputText: "" }
    case "uiWait":
      return { ...base, kind: "uiWait", selector: "", timeout: 5000 }
    case "apiHttp":
      return { ...base, kind: "apiHttp", method: "GET", url: "" }
    case "apiNotify":
      return { ...base, kind: "apiNotify", url: "" }
    case "dbQuery":
      return { ...base, kind: "dbQuery", datasource: "", sql: "" }
    case "dbExecute":
      return { ...base, kind: "dbExecute", datasource: "", sql: "" }
    case "assertText":
      return { ...base, kind: "assertText", selector: "", expected: "" }
    case "assertExists":
      return { ...base, kind: "assertExists", selector: "" }
    case "assertAI":
      return { ...base, kind: "assertAI", prompt: "" }
  }
}

// ─── 初始画布数据 ─────────────────────────────────────────────────────────────

const initialNodes: Node<AnyNodeData>[] = [
  {
    id: "n1", type: "webhookTrigger",
    position: { x: 100, y: 200 },
    data: { kind: "webhookTrigger", label: "接收任务事件", status: "已配置", webhookUrl: "https://api.openx.com/hook/v1/trigger/a1b2c3d4" },
  },
  {
    id: "n2", type: "uiClick",
    position: { x: 450, y: 200 },
    data: { kind: "uiClick", label: "点击「立即处理」按钮", status: "运行中", selector: "//android.widget.Button[@text='立即处理']" },
  },
  {
    id: "n3", type: "uiInput",
    position: { x: 800, y: 200 },
    data: { kind: "uiInput", label: "输入工单处理备注", status: "待配置", selector: "", inputText: "" },
  },
]

const initialEdges: Edge[] = [
  { id: "e1-2", source: "n1", target: "n2", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e2-3", source: "n2", target: "n3", markerEnd: { type: MarkerType.ArrowClosed } },
]

// ─── 节点库面板 ───────────────────────────────────────────────────────────────

function NodeLibraryPanel({
  onAddNode,
  onDragStart,
}: {
  onAddNode: (template: NodeTemplate) => void
  onDragStart: (e: React.DragEvent, template: NodeTemplate) => void
}) {
  const [search, setSearch] = useState("")
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return nodeGroups
    const q = search.toLowerCase()
    return nodeGroups
      .map((g) => ({ ...g, items: g.items.filter((i) => i.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0)
  }, [search])

  const toggleGroup = (name: string) =>
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }))

  return (
    <div className="flex h-full w-56 shrink-0 flex-col border-r bg-background">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-semibold">节点库</span>
        <span className="text-xs text-muted-foreground">
          {nodeGroups.reduce((s, g) => s + g.items.length, 0)} 个节点
        </span>
      </div>

      {/* 搜索 */}
      <div className="px-3 py-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="搜索节点..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 节点分组 */}
      <ScrollArea className="flex-1 min-h-0 mr-0.5">
        <div className="py-2">
          {filteredGroups.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">未找到匹配节点</p>
          ) : (
            filteredGroups.map((group) => {
              const category = NODE_KIND_TO_CATEGORY[group.groupKind]
              const color = CATEGORY_STYLES[category]
              const isCollapsed = collapsed[group.name]
              return (
                <div key={group.name} className="mb-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.name)}
                    className="flex w-full items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors"
                  >
                    <span className="flex-1 text-left text-xs font-medium">{group.name}</span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 text-muted-foreground transition-transform duration-200",
                        isCollapsed && "-rotate-90"
                      )}
                    />
                  </button>

                  {!isCollapsed && (
                    <div className="mx-2 mb-1 space-y-0.5 mr-3">
                      {group.items.map((template) => (
                        <button
                          key={template.nodeKind}
                          type="button"
                          draggable
                          onClick={() => onAddNode(template)}
                          onDragStart={(e) => onDragStart(e, template)}
                          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-accent cursor-grab active:cursor-grabbing transition-colors group/item"
                        >
                          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", color.iconBg)}>
                            <template.icon className={cn("size-4", color.iconText)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-medium leading-none">{template.name}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{group.name}</p>
                          </div>
                          <GripVertical className="size-3.5 text-muted-foreground/40 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* 底部提示 */}
      <div className="border-t px-3 py-2">
        <p className="text-[10px] text-muted-foreground text-center">拖拽或点击节点添加到画布</p>
      </div>
    </div>
  )
}

// ─── 画布工作区 ───────────────────────────────────────────────────────────────

function AutomationWorkbench() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AnyNodeData>>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeConfigOpen, setNodeConfigOpen] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const { theme } = useTheme()

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  )

  const updateNodeData = useCallback((id: string, data: Partial<AnyNodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } as AnyNodeData } : node
      )
    )
  }, [setNodes])

  const addTemplateNode = useCallback((template: NodeTemplate) => {
    const newId = `n${Date.now()}`
    const newNode: Node<AnyNodeData> = {
      id: newId,
      type: template.nodeKind,
      position: { x: 100 + nodes.length * 50, y: 200 + (nodes.length % 2) * 100 },
      data: buildNodeData(template),
    }
    setNodes((prev) => [...prev, newNode])
    setSelectedNodeId(newId)
    setNodeConfigOpen(true)
  }, [nodes.length, setNodes])

  const onConnect = useCallback((connection: Connection) => {
    setEdges((prev) =>
      addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed } }, prev)
    )
  }, [setEdges])

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node<AnyNodeData>) => {
    setSelectedNodeId(node.id)
    setNodeConfigOpen(true)
  }, [])

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId))
    setEdges((prev) => prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId))
    setSelectedNodeId(null)
    setNodeConfigOpen(false)
  }, [selectedNodeId, setNodes, setEdges])

  const onDragStart = useCallback((event: React.DragEvent, template: NodeTemplate) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify({
      nodeKind: template.nodeKind,
      name: template.name,
    }))
    event.dataTransfer.effectAllowed = "move"
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const dataStr = event.dataTransfer.getData("application/reactflow")
    if (!dataStr) return

    try {
      const { nodeKind, name } = JSON.parse(dataStr) as { nodeKind: NodeKind; name: string }
      // find icon from nodeGroups
      const allItems = nodeGroups.flatMap((g) => g.items)
      const found = allItems.find((i) => i.nodeKind === nodeKind)
      const template: NodeTemplate = { name, nodeKind, icon: found?.icon ?? Webhook }
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const newId = `n${Date.now()}`
      const newNode: Node<AnyNodeData> = {
        id: newId, type: nodeKind, position, data: buildNodeData(template),
      }
      setNodes((nds) => nds.concat(newNode))
      setSelectedNodeId(newId)
      setNodeConfigOpen(true)
    } catch (e) {
      console.error("Drop error", e)
    }
  }, [screenToFlowPosition, setNodes])

  return (
    <div className="flex h-full w-full overflow-hidden rounded-xl border bg-muted/20">
      {/* 左侧节点库 */}
      <NodeLibraryPanel onAddNode={addTemplateNode} onDragStart={onDragStart} />

      {/* 画布区域 */}
      <div className="relative flex-1 overflow-hidden">
        {/* 工具栏 */}
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-xs" variant="outline" className="size-8 bg-background/90 backdrop-blur-sm shadow-sm">
                <Settings className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>流程设置</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-xs" variant="outline" className="size-8 bg-background/90 backdrop-blur-sm shadow-sm">
                <Save className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>保存草稿</TooltipContent>
          </Tooltip>
          <Button size="sm" className="h-8 gap-1.5 px-3 shadow-sm">
            <Play className="size-3.5 fill-current" />
            运行流程
          </Button>
        </div>

        {/* ReactFlow */}
        <div className="absolute inset-0" ref={reactFlowWrapper}>
          <ReactFlow<Node<AnyNodeData>, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{ type: "smoothstep" }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={() => {
              setNodeConfigOpen(false)
              setSelectedNodeId(null)
            }}
            colorMode={theme}
            onDragOver={onDragOver}
            onDrop={onDrop}
            fitView
          >
            <Background gap={12} />
            {nodes.length === 0 && (
              <Panel position="top-center" className="!inset-0 !transform-none flex flex-col items-center justify-center gap-3 pointer-events-none select-none">
                <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40">
                  <Workflow className="size-7 text-muted-foreground/50" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">画布为空</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">从左侧节点库拖拽或点击节点开始编排</p>
                </div>
              </Panel>
            )}
            <MiniMap
              className="!bottom-4 !left-4 !right-auto !top-auto"
              pannable
              zoomable
            />
          </ReactFlow>
        </div>

        {/* 右侧配置面板 */}
        <ConfigPanel
          node={selectedNode as { id: string; type: string; data: AnyNodeData } | null}
          isOpen={nodeConfigOpen}
          onClose={() => setNodeConfigOpen(false)}
          onDelete={deleteSelectedNode}
          onUpdate={updateNodeData}
        />
      </div>
    </div>
  )
}

export function AutomationPage() {
  return (
    <section className="h-[calc(100vh-8rem)]">
      <TooltipProvider>
        <ReactFlowProvider>
          <AutomationWorkbench />
        </ReactFlowProvider>
      </TooltipProvider>
    </section>
  )
}
