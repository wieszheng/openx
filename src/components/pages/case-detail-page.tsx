import { useEffect, useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { casesApi } from "@/lib/api"
import type { TestCase } from "@/lib/api"

interface CaseDetailPageProps {
    caseId: string
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

function formatDateTime(iso: string) {
    return iso.replace("T", " ").slice(0, 19)
}

export function CaseDetailPage({
    caseId,
    onBack,
    onEdit,
    onExecute,
}: CaseDetailPageProps) {
    const [testCase, setTestCase] = useState<TestCase | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
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
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="mr-2 size-4" />
                    返回列表
                </Button>
            </div>
        )
    }

    const priorityConfig = PRIORITY_CONFIG[testCase.priority] ?? PRIORITY_CONFIG["P3"]
    const statusConfig = STATUS_CONFIG[testCase.status] ?? STATUS_CONFIG["正常运行"]

    return (
        <div className="space-y-6">
            {/* 顶部导航 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
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
                            <CardTitle className="text-xl">{testCase.name}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                用例ID: {testCase.id} · 版本 {testCase.version}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => onEdit?.(testCase.id)}
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

            {/* 描述信息 */}
            {testCase.description && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">用例描述</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {testCase.description}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* 测试步骤 / 前置条件 / 预期结果 */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* 左侧：前置条件 */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">前置条件</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {testCase.preconditions ? (
                            <div className="space-y-2">
                                {testCase.preconditions.split("\n").map((line, i) => (
                                    <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                                        {line}
                                    </p>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">暂无前置条件</p>
                        )}
                    </CardContent>
                </Card>

                {/* 中间：测试步骤 */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">测试步骤</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {testCase.steps_manual && testCase.steps_manual.length > 0 ? (
                            <div className="space-y-4">
                                {testCase.steps_manual.map((step, index) => (
                                    <div key={index} className="relative pl-8">
                                        {/* 步骤序号 */}
                                        <div className="absolute left-0 top-0 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                                            {(step as { step: number }).step ?? index + 1}
                                        </div>
                                        {/* 步骤内容 */}
                                        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">操作步骤</p>
                                                <p className="mt-0.5 text-sm">{(step as { action: string }).action}</p>
                                            </div>
                                            <Separator />
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">预期结果</p>
                                                <p className="mt-0.5 text-sm">
                                                    {(step as { expected: string }).expected ?? "—"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">暂无测试步骤</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 预期结果 */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">预期结果</CardTitle>
                </CardHeader>
                <CardContent>
                    {testCase.expected_result ? (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {testCase.expected_result}
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground">暂无预期结果</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
