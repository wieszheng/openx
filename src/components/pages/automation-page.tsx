import { useMemo, useState } from "react"
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  Fingerprint,
  Globe,
  Hand,
  MousePointer2,
  Move,
  Play,
  Plus,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Type,
  Webhook,
  X,
} from "lucide-react"
import {
  addEdge,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  type Connection,
  type Edge,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type NodeData = {
  label: string
  category: string
  status: "已配置" | "运行中" | "待配置"
  icon: React.ComponentType<{ className?: string }>
}

type NodeTemplate = {
  name: string
  type: string
  icon: React.ComponentType<{ className?: string }>
}

type NodeGroup = {
  name: string
  icon: React.ComponentType<{ className?: string }>
  items: NodeTemplate[]
}

const nodeGroups: NodeGroup[] = [
  {
    name: "触发器",
    icon: Webhook,
    items: [
      { name: "Webhook 触发器", type: "触发器", icon: Webhook },
    ],
  },
  {
    name: "APP UI 操作",
    icon: Hand,
    items: [
      { name: "启动应用", type: "APP UI 操作", icon: Play },
      { name: "关闭应用", type: "APP UI 操作", icon: X },
      { name: "点击", type: "APP UI 操作", icon: MousePointer2 },
      { name: "双击", type: "APP UI 操作", icon: Fingerprint },
      { name: "滑动", type: "APP UI 操作", icon: Move },
      { name: "文本输入", type: "APP UI 操作", icon: Type },
      { name: "等待元素", type: "APP UI 操作", icon: Clock3 },
    ],
  },
  {
    name: "接口请求",
    icon: Globe,
    items: [
      { name: "HTTP 请求", type: "接口请求", icon: Activity },
      { name: "结果通知", type: "接口请求", icon: Sparkles },
    ],
  },
  {
    name: "数据操作",
    icon: Database,
    items: [
      { name: "SQL 查询", type: "数据操作", icon: Database },
      { name: "SQL 执行", type: "数据操作", icon: Database },
    ],
  },
  {
    name: "断言",
    icon: CheckCircle2,
    items: [
      { name: "断言文本", type: "断言", icon: CheckCircle2 },
      { name: "断言元素存在", type: "断言", icon: CheckCircle2 },
      { name: "AI 分析", type: "AI 节点", icon: Bot },
    ],
  },
]

const initialNodes: Node<NodeData>[] = [
  {
    id: "n1",
    position: { x: 100, y: 200 },
    data: { label: "接收任务事件", category: "触发器", status: "已配置", icon: Webhook },
  },
  {
    id: "n2",
    position: { x: 400, y: 200 },
    data: { label: "点击「立即处理」按钮", category: "APP UI 操作", status: "运行中", icon: Webhook },
  },
  {
    id: "n3",
    position: { x: 700, y: 200 },
    data: { label: "输入工单处理备注", category: "APP UI 操作", status: "待配置", icon: Type },
  },
]

const initialEdges: Edge[] = [
  { id: "e1-2", source: "n1", target: "n2", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e2-3", source: "n2", target: "n3", markerEnd: { type: MarkerType.ArrowClosed } },
]

function AutomationWorkbench() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeConfigOpen, setNodeConfigOpen] = useState(false)
  const operationLogs = [
    "22:16:31 点击按钮: #submit-ticket",
    "22:16:33 输入文本: 处理完成",
  ]

  const selectedNode = useMemo(
    () => nodes.find((item) => item.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  )

  const addTemplateNode = (templateName: string, templateType: string, icon: React.ComponentType<{ className?: string }>) => {
    const newId = `n${Date.now()}`
    const newNode: Node<NodeData> = {
      id: newId,
      position: { x: 100 + nodes.length * 50, y: 200 + (nodes.length % 2) * 100 },
      data: { label: templateName, category: templateType, status: "待配置", icon },
    }
    setNodes((prev) => [...prev, newNode])
    setSelectedNodeId(newId)
    setNodeConfigOpen(true)
  }

  const onConnect = (connection: Connection) => {
    setEdges((prev) =>
      addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed } }, prev)
    )
  }

  const handleNodeClick = (_: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNodeId(node.id)
    setNodeConfigOpen(true)
  }

  const deleteSelectedNode = () => {
    if (selectedNodeId) {
      setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId))
      setEdges((prev) => prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId))
      setSelectedNodeId(null)
      setNodeConfigOpen(false)
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border bg-muted/20">
      {/* 全屏画布 */}
      <div className="absolute inset-0">
        <ReactFlow<Node<NodeData>, Edge>
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          fitView
          className="bg-gradient-to-br from-muted/10 to-background"
        >
          <Background gap={20} size={1} color="hsl(var(--border))" />
          <Controls className="!bottom-4 !left-4 !top-auto" />
          <MiniMap
            className="!bottom-4 !right-4 !top-auto"
            pannable
            zoomable
            nodeColor={(node) => {
              switch (node.data.status) {
                case "已配置":
                  return "hsl(var(--primary))"
                case "运行中":
                  return "hsl(142 76% 40%)"
                default:
                  return "hsl(var(--muted-foreground))"
              }
            }}
          />
        </ReactFlow>
      </div>

      {/* 左上角悬浮 - 节点库面板 (hover展开/收起) */}
      <div className="absolute left-4 top-4 z-20 group">
        <div className="flex flex-col">
          {/* 触发按钮 */}
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background shadow-md cursor-pointer hover:bg-accent transition-colors"
            onClick={() => addTemplateNode("Webhook 触发器", "触发器", Webhook)}
          >
            <Plus className="size-5 text-primary" />
          </div>

          {/* 展开面板 */}
          <div className="mt-2 w-53 rounded-xl border bg-background shadow-xl transition-all duration-300 opacity-0 -translate-y-2 group-hover:opacity-120 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">

            <div className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-3 px-1">选择节点类型</p>
              <ScrollArea className="h-100">
                <div className="space-y-3 mr-1">
                  {nodeGroups.map((group) => (
                    <div key={group.name}>
                      <div className="flex items-center gap-2 px-2 py-1">
                        <group.icon className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{group.name}</span>
                        <span className="text-xs text-muted-foreground">({group.items.length})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pl-1">
                        {group.items.map((template) => (
                          <button
                            key={template.name}
                            type="button"
                            onClick={() => addTemplateNode(template.name, template.type, template.icon)}
                            className="flex flex-col items-center gap-1.5 p-1 rounded-lg hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
                          >
                            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                              <template.icon className="size-5 text-primary" />
                            </div>
                            <span className="text-xs text-center leading-tight">{template.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

          </div>
        </div>
      </div>

      {/* 右上角悬浮 - 工具栏 */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <Card className="shadow-xl border-2 backdrop-blur-sm bg-background/95 px-2 py-1.5">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-xs" variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Settings className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>设置</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="h-5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-xs" variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Save className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>保存草稿</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="h-5" />
            <Button size="sm" className="gap-1.5 h-7">
              <Play className="size-3" />
              运行流程
            </Button>
          </div>
        </Card>
      </div>

      {/* 右侧悬浮 - 节点配置面板 */}
      <div
        className={`
          absolute right-4 top-1/2 -translate-y-1/2 z-20 w-72 transition-all duration-300
          ${nodeConfigOpen && selectedNode ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"}
        `}
      >
        <Card className="shadow-xl border-2 backdrop-blur-sm bg-background/95">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">节点配置</CardTitle>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={deleteSelectedNode}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>删除节点</TooltipContent>
                </Tooltip>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => {
                    setNodeConfigOpen(false)
                    setSelectedNodeId(null)
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedNode?.data.label ?? "未选择节点"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">节点类型</p>
              <Input
                value={selectedNode?.data.category ?? ""}
                readOnly
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">执行模型</p>
              <Select defaultValue="appium-operator">
                <SelectTrigger className="w-full h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appium-operator">appium-operator</SelectItem>
                  <SelectItem value="uiautomator2">uiautomator2</SelectItem>
                  <SelectItem value="xctest">xctest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border p-2.5">
                <span className="text-sm">失败重试</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-2.5">
                <span className="text-sm">截图留存</span>
                <Switch defaultChecked />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-medium">执行日志</p>
              <ScrollArea className="h-28 rounded-md border p-2">
                <div className="space-y-1">
                  {operationLogs.map((log, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {log}
                    </p>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  98.7%
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3.5 text-amber-500" />
                  1.8s
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function AutomationPage() {
  return (
    <section className="h-[calc(100vh-8rem)]">
      <TooltipProvider delayDuration={300}>
        <ReactFlowProvider>
          <AutomationWorkbench />
        </ReactFlowProvider>
      </TooltipProvider>
    </section>
  )
}
