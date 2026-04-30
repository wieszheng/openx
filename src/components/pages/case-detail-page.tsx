import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
    ArrowLeft,
    Calendar,
    ChevronRight,
    FileText,
    Play,
    Settings,
    Tag,
    User,
    Zap,
    Workflow,
} from "lucide-react"
import {
    Background,
    MarkerType,
    MiniMap,
    type Edge,
    type Node,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { casesApi } from "@/lib/api"
import type { TestCase } from "@/lib/api"
import { useTheme } from "@/components/theme-provider"
import { CaseEditDialog } from "@/components/case-edit-dialog"

// 引入自动化节点相关
import { nodeTypes } from "./automation/nodes/node-registry"
import {
    NODE_KIND_TO_CATEGORY,
    type AnyNodeData,
    type NodeCategory,
    type NodeKind,
} from "./automation/nodes/types"

interface CaseDetailPageProps {
    caseId?: string
    onBack?: () => void
    onEdit?: (id: string) => void
    onExecute?: (id: string) => void
}

// 优先级配置
const PRIORITY_CONFIG: Record<
    string,
    { label: string; bg: string; text: string; border: string }
> = {
    P0: { label: "P0 紧急", bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
    P1: { label: "P1 高", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
    P2: { label: "P2 中", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
    P3: { label: "P3 低", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
}

// 状态配置
const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
    "正常运行": { label: "正常运行", dot: "bg-emerald-500" },
    "调试中": { label: "调试中", dot: "bg-blue-500" },
    "已停用": { label: "已停用", dot: "bg-slate-400" },
}

// ─── 分类颜色映射（用于边）───────────────────────────────────────────────────
const CATEGORY_EDGE_COLORS: Record<NodeCategory, string> = {
    trigger: "#8b5cf6", // violet
    appUi:   "#3b82f6", // blue
    api:     "#06b6d4", // cyan
    data:    "#f59e0b", // amber
    assert:  "#10b981", // emerald
}

function getEdgeColorByNodeKind(kind: string): string {
    const category = NODE_KIND_TO_CATEGORY[kind as NodeKind]
    return CATEGORY_EDGE_COLORS[category]
}



function formatDateTime(iso: string) {
    return iso.replace("T", " ").slice(0, 19)
}

// ─── Mock 自动测试流程数据 ────────────────────────────────────────────────────
const MOCK_AUTO_TEST_NODES: Node<AnyNodeData>[] = [
    {
        id: "n1",
        type: "webhookTrigger",
        position: { x: 100, y: 200 },
        data: { kind: "webhookTrigger", label: "接收任务事件", status: "已配置", webhookUrl: "https://api.openx.com/hook/v1/trigger/a1b2c3d4" },
    },
    {
        id: "n2",
        type: "appLaunch",
        position: { x: 400, y: 200 },
        data: { kind: "appLaunch", label: "启动测试应用", status: "已配置", packageName: "com.example.app", launchType: "warm" },
    },
    {
        id: "n3",
        type: "uiClick",
        position: { x: 700, y: 200 },
        data: { kind: "uiClick", label: "点击登录按钮", status: "已配置", selector: "//android.widget.Button[@text='登录']" },
    },
    {
        id: "n4",
        type: "uiInput",
        position: { x: 700, y: 400 },
        data: { kind: "uiInput", label: "输入用户名", status: "已配置", selector: "//android.widget.EditText[@hint='用户名']", inputText: "test_user" },
    },
    {
        id: "n5",
        type: "assertExists",
        position: { x: 1000, y: 300 },
        data: { kind: "assertExists", label: "断言首页加载", status: "已配置", selector: "//android.widget.TextView[@text='首页']" },
    },
]

const MOCK_AUTO_TEST_EDGES: Edge[] = [
    {
        id: "e1-2",
        source: "n1",
        target: "n2",
        type: "bezier",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: CATEGORY_EDGE_COLORS.trigger, strokeWidth: 2, strokeDasharray: "5,5" },
        animated: true,
    },
    {
        id: "e2-3",
        source: "n2",
        target: "n3",
        type: "bezier",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: CATEGORY_EDGE_COLORS.appUi, strokeWidth: 2, strokeDasharray: "5,5" },
        animated: true,
    },
    {
        id: "e2-4",
        source: "n2",
        target: "n4",
        type: "bezier",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: CATEGORY_EDGE_COLORS.appUi, strokeWidth: 2, strokeDasharray: "5,5" },
        animated: true,
    },
    {
        id: "e3-5",
        source: "n3",
        target: "n5",
        type: "bezier",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: CATEGORY_EDGE_COLORS.appUi, strokeWidth: 2, strokeDasharray: "5,5" },
        animated: true,
    },
    {
        id: "e4-5",
        source: "n4",
        target: "n5",
        type: "bezier",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: CATEGORY_EDGE_COLORS.appUi, strokeWidth: 2, strokeDasharray: "5,5" },
        animated: true,
    },
]

// ─── 自动测试画布组件（只读）────────────────────────────────────────────────────
function AutoTestCanvas() {
    const { theme } = useTheme()

    return (
        <div className="flex h-[600px] w-full overflow-hidden rounded-lg border bg-muted/20">
            {/* 画布区域 - 只读 */}
            <div className="relative flex-1 overflow-hidden">
                <ReactFlow<Node<AnyNodeData>, Edge>
                    nodes={MOCK_AUTO_TEST_NODES}
                    edges={MOCK_AUTO_TEST_EDGES}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={{
                        type: "bezier",
                        style: { strokeWidth: 2, strokeDasharray: "5,5" },
                        animated: true,
                    }}
                    colorMode={theme}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    snapToGrid
                    snapGrid={[16, 16]}
                    // 禁用所有交互
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    zoomOnScroll={true}
                    zoomOnPinch={true}
                    panOnScroll={false}
                    panOnDrag={true}
                    selectionOnDrag={false}
                    selectNodesOnDrag={false}
                >
                    <Background gap={12} />
                    <MiniMap
                        pannable
                        zoomable
                        position="bottom-left"
                        nodeBorderRadius={20}
                        nodeColor={(node) => getEdgeColorByNodeKind(node.type ?? "")}
                    />
                </ReactFlow>

                {/* 只读提示 */}
                <div className="absolute left-3 top-3 z-20">
                    <Badge variant="secondary" className="text-[10px] h-6 gap-1">
                        <Workflow className="size-3" />
                        只读模式
                    </Badge>
                </div>
            </div>
        </div>
    )
}

export function CaseDetailPage({
    caseId: propCaseId,
    onBack,
    onEdit,
    onExecute,
}: CaseDetailPageProps) {
    const { id: paramId } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const caseId = propCaseId ?? paramId ?? ""
    const goBack = onBack ?? (() => navigate("/cases"))

    const [testCase, setTestCase] = useState<TestCase | null>(null)
    const [loading, setLoading] = useState(true)
    const [isEditOpen, setIsEditOpen] = useState(false)

    useEffect(() => {
        if (!caseId) return
        setLoading(true)
        casesApi.get(caseId)
            .then(setTestCase)
            .catch(() => setTestCase(null))
            .finally(() => setLoading(false))
    }, [caseId])

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <div className="text-muted-foreground">加载中…</div>
            </div>
        )
    }

    if (!testCase) {
        return (
            <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
                <FileText className="size-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">未找到该用例</p>
                <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="mr-2 size-4" />
                    返回列表
                </Button>
            </div>
        )
    }

    const priorityConfig = PRIORITY_CONFIG[testCase.priority] ?? PRIORITY_CONFIG["P3"]
    const statusConfig = STATUS_CONFIG[testCase.status] ?? STATUS_CONFIG["正常运行"]

    return (
        <>
        <div className="space-y-6">
            {/* 顶部导航 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={goBack}>
                    <ArrowLeft className="size-4" />
                    返回
                </Button>
                <ChevronRight className="size-4" />
                <span>用例管理</span>
                <ChevronRight className="size-4" />
                <span className="text-foreground">{testCase.name}</span>
            </div>

            {/* 信息卡片 - 包含标题栏和三行四列内容 */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <CardTitle className="text-lg">{testCase.name}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                描述信息: {testCase.description}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => setIsEditOpen(true)}
                            >
                                <Settings className="size-4" />
                                编辑
                            </Button>
                            <Button
                                size="sm"
                                className="gap-2"
                                onClick={() => onExecute?.(testCase.id)}
                            >
                                <Play className="size-4" />
                                执行
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* 三行四列网格布局 */}
                    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* 第一行 */}
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-muted-foreground">用例名称:</p>
                            <p className="text-sm font-medium truncate" title={testCase.name}>
                                {testCase.name}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-muted-foreground">用例版本:</p>
                            <p className="text-sm">v{testCase.version}</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-muted-foreground">用例状态:</p>
                            <div className="flex items-center gap-2">
                                <span className={`size-2 rounded-full ${statusConfig.dot}`} />
                                <span className="text-sm">{statusConfig.label}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-muted-foreground">创建人:</p>
                            <div className="flex items-center gap-1.5 text-sm">
                                <User className="size-4 text-muted-foreground" />
                                {testCase.created_by ?? "—"}
                            </div>
                        </div>

                        {/* 第二行 */}
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-muted-foreground">优先级:</p>
                            <Badge
                                variant="outline"
                                className={`font-mono ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}
                            >
                                {priorityConfig.label}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-muted-foreground">自动化:</p>
                            <div className="flex items-center gap-1.5 text-sm">
                                <Zap
                                    className={`size-4 ${testCase.is_automated ? "text-amber-500" : "text-muted-foreground"
                                        }`}
                                />
                                {testCase.is_automated ? "已自动化" : "手工用例"}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-muted-foreground">创建时间:</p>
                            <div className="flex items-center gap-1.5 text-sm">
                                <Calendar className="size-4 text-muted-foreground" />
                                {formatDateTime(testCase.created_at)}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-muted-foreground">更新时间:</p>
                            <div className="flex items-center gap-1.5 text-sm">
                                <Calendar className="size-4 text-muted-foreground" />
                                {formatDateTime(testCase.updated_at)}
                            </div>
                        </div>

                        {/* 第三行 - 标签占满整行 */}
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-muted-foreground">标签:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {testCase.tags.length > 0 ? (
                                    testCase.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="gap-1">
                                            <Tag className="size-3" />
                                            {tag}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-sm text-muted-foreground">暂无标签</span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 用例详情 - Tabs切换 */}
            <Card className="p-4">
                <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="manual" className="gap-1.5">
                            <User className="size-3.5" />
                            手工测试
                        </TabsTrigger>
                        <TabsTrigger value="auto" className="gap-1.5">
                            <Zap className="size-3.5" />
                            自动测试
                        </TabsTrigger>
                    </TabsList>

                    {/* 手工测试 */}
                    <TabsContent value="manual" className="space-y-0">
                        {/* 前置条件 */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs">
                                    前置条件
                                </Badge>
                            </div>
                            <div className="pl-4 text-sm text-muted-foreground">
                                {testCase.preconditions ? (
                                    testCase.preconditions.split("\n").map((line, i) => (
                                        <p key={i}>{line}</p>
                                    ))
                                ) : (
                                    <span className="text-muted-foreground/50">暂无</span>
                                )}
                            </div>
                        </div>

                        {/* 测试步骤 */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs">
                                    测试步骤
                                </Badge>
                            </div>
                            <div className="space-y-2 pl-3">
                                {testCase.steps_manual && testCase.steps_manual.length > 0 ? (
                                    testCase.steps_manual.map((step, index) => (
                                        <div key={index} className="flex gap-3">
                                            <div className="flex-shrink-0 flex items-center justify-center size-4.5 rounded-full bg-emerald-500 text-xs font-medium text-white ">
                                                {(step as { step: number }).step ?? index + 1}
                                            </div>
                                            <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-xs text-muted-foreground">操作: </span>
                                                    <span>{(step as { action: string }).action}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground">预期: </span>
                                                    <span>{(step as { expected: string }).expected ?? "—"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground/50 pl-8">暂无测试步骤</p>
                                )}
                            </div>
                        </div>

                        {/* 预期结果 */}
                        {testCase.expected_result && (
                            <div>
                                <div className="flex items-center gap-2  mb-2">
                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs">
                                        预期结果
                                    </Badge>
                                </div>
                                <div className="pl-4 text-sm text-muted-foreground">
                                    {testCase.expected_result}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* 自动测试 */}
                    <TabsContent value="auto" className="space-y-0">
                        <ReactFlowProvider>
                            <AutoTestCanvas />
                        </ReactFlowProvider>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>

        {/* 编辑弹窗 */}
        {testCase && (
            <CaseEditDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                caseData={testCase}
                directoryId={testCase.directory_id ?? ""}
                onSuccess={(updated) => setTestCase(updated)}
            />
        )}
        </>
    )
}
