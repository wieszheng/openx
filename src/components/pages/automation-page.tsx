import { useMemo, useState, useCallback, useRef } from "react"
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
  useReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { CustomNode } from "./automation/nodes/custom-node"
import { ConfigPanel } from "./automation/nodes/config-panel"

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
    type: "customNode",
    position: { x: 100, y: 200 },
    data: { label: "接收任务事件", category: "触发器", status: "已配置", icon: Webhook },
  },
  {
    id: "n2",
    type: "customNode",
    position: { x: 450, y: 200 },
    data: { label: "点击「立即处理」按钮", category: "APP UI 操作", status: "运行中", icon: MousePointer2 },
  },
  {
    id: "n3",
    type: "customNode",
    position: { x: 800, y: 200 },
    data: { label: "输入工单处理备注", category: "APP UI 操作", status: "待配置", icon: Type },
  },
]

const initialEdges: Edge[] = [
  { id: "e1-2", source: "n1", target: "n2", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e2-3", source: "n2", target: "n3", markerEnd: { type: MarkerType.ArrowClosed } },
]

const nodeTypes = {
  customNode: CustomNode,
}

function AutomationWorkbench() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeConfigOpen, setNodeConfigOpen] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const selectedNode = useMemo(
    () => nodes.find((item) => item.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  )

  const updateNodeData = (id: string, data: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, ...data }
        }
        return node
      })
    )
  }

  const addTemplateNode = (templateName: string, templateType: string, icon: React.ComponentType<{ className?: string }>) => {
    const newId = `n${Date.now()}`
    const newNode: Node<NodeData> = {
      id: newId,
      type: "customNode",
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

  const onDragStart = (event: React.DragEvent, nodeData: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData))
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const dataStr = event.dataTransfer.getData('application/reactflow')
      
      if (!dataStr || !reactFlowBounds) return

      try {
        const nodeData = JSON.parse(dataStr)
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })

        // find icon component dynamically based on node type, since we can't stringify components
        // For drag and drop, we need a lookup table. But since we just stringified nodeData, icon is missing.
        // Let's look it up from nodeGroups
        let foundIcon: React.ComponentType<{ className?: string }> = Webhook
        for (const group of nodeGroups) {
          const item = group.items.find(i => i.name === nodeData.label && i.type === nodeData.category)
          if (item) {
            foundIcon = item.icon
            break
          }
        }

        const newId = `n${Date.now()}`
        const newNode: Node<NodeData> = {
          id: newId,
          type: 'customNode',
          position,
          data: { 
            label: nodeData.label, 
            category: nodeData.category, 
            status: "待配置", 
            icon: foundIcon 
          },
        }

        setNodes((nds) => nds.concat(newNode))
        setSelectedNodeId(newId)
        setNodeConfigOpen(true)
      } catch (e) {
        console.error("Drop error", e)
      }
    },
    [screenToFlowPosition, setNodes]
  )

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border bg-muted/20">
      {/* 全屏画布 */}
      <div className="absolute inset-0" ref={reactFlowWrapper}>
        <ReactFlow<Node<NodeData>, Edge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={() => {
            setNodeConfigOpen(false)
            setSelectedNodeId(null)
          }}
          onDragOver={onDragOver}
          onDrop={onDrop}
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
          <div className="mt-2 w-53 rounded-xl border bg-background shadow-xl transition-all duration-300 opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
            <div className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-3 px-1">拖拽或点击添加节点</p>
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
                            onDragStart={(e) => onDragStart(e, { label: template.name, category: template.type })}
                            draggable
                            className="flex flex-col items-center gap-1.5 p-1 rounded-lg hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
                          >
                            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 pointer-events-none">
                              <template.icon className="size-5 text-primary" />
                            </div>
                            <span className="text-xs text-center leading-tight pointer-events-none">{template.name}</span>
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
      <ConfigPanel
        node={selectedNode}
        isOpen={nodeConfigOpen}
        onClose={() => setNodeConfigOpen(false)}
        onDelete={deleteSelectedNode}
        onUpdate={updateNodeData}
      />
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
