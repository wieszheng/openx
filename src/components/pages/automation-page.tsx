import { useEffect, useMemo, useState, useCallback } from "react"
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  DatabaseZap,
  FileText,
  Fingerprint,
  GripVertical,
  Link2,
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
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
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
  type NodeCategory,
  type NodeKind,
} from "./automation/nodes/types"
import { CaseSelectorDialog } from "@/components/case-selector-dialog"
import type { TestCase } from "@/lib/api"
import { casesApi, scriptsApi } from "@/lib/api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useSearchParams } from "react-router-dom"

// ─── 分类颜色映射（用于边）───────────────────────────────────────────────────
const CATEGORY_EDGE_COLORS: Record<NodeCategory, string> = {
  trigger: "#8b5cf6", // violet
  appUi:   "#3b82f6", // blue
  api:     "#06b6d4", // cyan
  data:    "#f59e0b", // amber
  assert:  "#10b981", // emerald
}

// ─── 辅助函数：根据节点类型获取边颜色 ────────────────────────────────────────
function getEdgeColorByNodeKind(kind: string): string {
  const category = NODE_KIND_TO_CATEGORY[kind as NodeKind]
  return CATEGORY_EDGE_COLORS[category]
}

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
    name: "APP操作",
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
      return { ...base, kind: "appLaunch", packageName: "", launchType: "warm" }
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
  {
    id: "e1-2",
    source: "n1",
    target: "n2",
    type: "bezier",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: getEdgeColorByNodeKind("webhookTrigger"), strokeWidth: 2, strokeDasharray: "5,5" },
    animated: true,
  },
  {
    id: "e2-3",
    source: "n2",
    target: "n3",
    type: "bezier",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: getEdgeColorByNodeKind("uiClick"), strokeWidth: 2, strokeDasharray: "5,5" },
    animated: true,
  },
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
    <div className="flex h-full w-56 shrink-0 flex-col border-r">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-semibold">节点操作</span>
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
  const [boundCase, setBoundCase] = useState<TestCase | null>(null)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingCase, setPendingCase] = useState<TestCase | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { screenToFlowPosition } = useReactFlow()
  const { theme } = useTheme()
  const [searchParams] = useSearchParams()

  // URL 参数 caseId 自动绑定用例（从详情页跳转）
  useEffect(() => {
    const caseId = searchParams.get("caseId")
    if (!caseId) return
    casesApi.get(caseId).then((c) => setBoundCase(c)).catch(() => {})
  }, [searchParams])

  // 切换关联用例时，从后端加载脚本
  useEffect(() => {
    if (!boundCase) {
      setNodes(initialNodes)
      setEdges(initialEdges)
      return
    }
    scriptsApi.get(boundCase.id)
      .then((script) => {
        setNodes(script.nodes as Node<AnyNodeData>[])
        setEdges(script.edges as Edge[])
      })
      .catch(() => {
        setNodes([])
        setEdges([])
      })
  }, [boundCase?.id])

  // 选择新用例：若新用例已有脚本则弹确认框
  const handleCaseSelect = useCallback((newCase: TestCase) => {
    if (newCase.id === boundCase?.id) return
    if (newCase.is_automated) {
      setPendingCase(newCase)
      setConfirmOpen(true)
    } else {
      setBoundCase(newCase)
    }
  }, [boundCase?.id])

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

  const handleSave = useCallback(async () => {
    if (!boundCase || saving) return
    setSaving(true)
    try {
      await scriptsApi.save(boundCase.id, {
        nodes: nodes as unknown as Record<string, unknown>[],
        edges: edges as unknown as Record<string, unknown>[],
      })
    } finally {
      setSaving(false)
    }
  }, [boundCase, saving, nodes, edges])

  const onConnect = useCallback((connection: Connection) => {
    // 根据源节点类型获取边颜色
    const sourceNode = nodes.find((n) => n.id === connection.source)
    const edgeColor = sourceNode ? getEdgeColorByNodeKind(sourceNode.type ?? "") : "#6366f1"

    setEdges((prev) =>
      addEdge({
        ...connection,
        type: "bezier",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: edgeColor, strokeWidth: 2, strokeDasharray: "5,5" },
        animated: true,
      }, prev)
    )
  }, [nodes, setEdges])

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
    event.dataTransfer.setData("application/reactflow-type", template.nodeKind)
    event.dataTransfer.setData("application/reactflow-data", JSON.stringify(buildNodeData(template)))
    event.dataTransfer.effectAllowed = "move"
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer.getData("application/reactflow-type")
    const dataStr = event.dataTransfer.getData("application/reactflow-data")
    if (!type) return

    const position = screenToFlowPosition({ x: event.clientX - 80, y: event.clientY })
    const newId = `n${Date.now()}`
    const newNode: Node<AnyNodeData> = {
      id: newId,
      type,
      position,
      data: JSON.parse(dataStr || "{}"),
    }
    setNodes((nds) => nds.concat(newNode))
    setSelectedNodeId(newId)
    setNodeConfigOpen(true)
  }, [screenToFlowPosition, setNodes])

  return (
    <div className="flex h-full flex-col space-y-4">

      {/* ── 用例绑定区（画布外） ─────────────────────────────────── */}
      <Card className="p-3">
        {boundCase ? (
          <div className="flex items-center gap-2">
            {/* 图标 */}
            <FileText className="size-4 shrink-0 text-primary" />

            {/* 用例信息 */}
            <div className="flex flex-1 items-center gap-3 min-w-0">
              {/* 名称 */}
              <span className="max-w-[260px] truncate text-sm font-semibold">
                {boundCase.name}
              </span>

              {/* 优先级 */}
              <Badge
                variant="outline"
                className={`shrink-0 font-mono text-[11px] ${
                  boundCase.priority === "P0" ? "bg-red-100 text-red-700 border-red-200" :
                  boundCase.priority === "P1" ? "bg-orange-100 text-orange-700 border-orange-200" :
                  boundCase.priority === "P2" ? "bg-blue-100 text-blue-700 border-blue-200" :
                  "bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                {boundCase.priority}
              </Badge>

              {/* 状态 */}
              <div className="flex shrink-0 items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${
                  boundCase.status === "正常运行" ? "bg-emerald-500" :
                  boundCase.status === "调试中"   ? "bg-blue-500" :
                  "bg-slate-400"
                }`} />
                <span className="text-xs text-muted-foreground">{boundCase.status}</span>
              </div>

              {/* 分隔 */}
              <span className="text-muted-foreground/50">·</span>

              {/* 创建人 */}
              {boundCase.created_by && (
                <span className="shrink-0 text-xs text-muted-foreground">{boundCase.created_by}</span>
              )}

              {/* 标签 */}
              {boundCase.tags.length > 0 && (
                <div className="flex items-center gap-1 overflow-hidden">
                  {boundCase.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="h-4 px-1.5 text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                  {boundCase.tags.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{boundCase.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>

            {/* 操作 */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-[13px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                onClick={() => setSelectorOpen(true)}
              >
                <Link2 className="size-4" />
                更换
              </button>
              <button
                type="button"
                className="text-muted-foreground/40 hover:text-destructive"
                onClick={() => setBoundCase(null)}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <FileText className="size-4 text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground">当前工作流未关联用例</span>
            <button
              type="button"
              className="ml-auto flex items-center gap-1.5 rounded-md border border-dashed border-muted-foreground/40 px-3 py-1 text-[13px] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
              onClick={() => setSelectorOpen(true)}
            >
              <Link2 className="size-4" />
              关联用例
            </button>
          </div>
        )}
      </Card>

      {/* ── 画布主体 ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden rounded-xl border bg-muted/20">
        {/* 左侧节点库 */}
        <NodeLibraryPanel onAddNode={addTemplateNode} onDragStart={onDragStart} />

        {/* 画布区域 */}
        <div className="relative flex-1 overflow-hidden">
          {/* 悬浮工具栏（还原原始位置） */}
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
                <Button
                  size="icon-xs"
                  variant="outline"
                  className="size-8 bg-background/90 backdrop-blur-sm shadow-sm"
                  disabled={!boundCase || saving}
                  onClick={handleSave}
                >
                  <Save className={cn("size-3.5", saving && "animate-spin")} />
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
          <div className="absolute inset-0">
            <ReactFlow<Node<AnyNodeData>, Edge>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={{
                type: "bezier",
                style: { strokeWidth: 2, strokeDasharray: "5,5" },
                animated: true,
              }}
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
              snapToGrid
              snapGrid={[16, 16]}
              deleteKeyCode={["Backspace", "Delete"]}
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
                pannable
                zoomable
                position="bottom-left"
                nodeBorderRadius={20}
                nodeColor={(node) => getEdgeColorByNodeKind(node.type ?? "")}
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

      {/* 用例选择器 */}
      <CaseSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        currentCase={boundCase}
        onSelect={handleCaseSelect}
      />

      {/* 切换用例确认弹窗（新用例已有脚本时） */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>切换关联用例</AlertDialogTitle>
            <AlertDialogDescription>
              用例「{pendingCase?.name}」已有自动化脚本，切换后将加载其脚本并覆盖当前画布内容，是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingCase(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingCase) setBoundCase(pendingCase)
              setPendingCase(null)
            }}>
              确认切换
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function AutomationPage() {
  return (
    <section className="h-[calc(100vh-6rem)]">
      <TooltipProvider>
        <ReactFlowProvider>
          <AutomationWorkbench />
        </ReactFlowProvider>
      </TooltipProvider>
    </section>
  )
}
