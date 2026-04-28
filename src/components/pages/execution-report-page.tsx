import { useState } from "react"
import { CheckCircle2, XCircle, AlertTriangle, SkipForward, FileText, Monitor, Clock, User, ArrowLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { Pie, PieChart } from "recharts"
import {
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart"

const pieData = [
    { name: "success", value: 30, fill: "#22c55e" },
    { name: "failed", value: 2, fill: "#ef4444" },
    { name: "error", value: 10, fill: "#f59e0b" },
    { name: "skipped", value: 0, fill: "#3b82f6" },
]

const chartConfig = {
    success: { label: "成功", color: "#22c55e" },
    failed: { label: "失败", color: "#ef4444" },
    error: { label: "错误", color: "#f59e0b" },
    skipped: { label: "跳过", color: "#3b82f6" },
} satisfies ChartConfig

const testCases = [
    {
        id: "28",
        name: "查询不存在的用户",
        retryCount: 0,
        status: "成功",
        method: "GET",
        startTime: "2021-08-15 00:48:28",
        endTime: "2021-08-15 00:48:29",
    },
    {
        id: "29",
        name: "查询存在的用户",
        retryCount: 0,
        status: "成功",
        method: "GET",
        startTime: "2021-08-15 00:48:28",
        endTime: "2021-08-15 00:48:29",
    },
    {
        id: "27",
        name: "查询所有用户列表",
        retryCount: 0,
        status: "成功",
        method: "GET",
        startTime: "2021-08-15 00:48:28",
        endTime: "2021-08-15 00:48:29",
    },
]

const statusIcons: Record<string, { icon: typeof CheckCircle2; className: string }> = {
    成功: { icon: CheckCircle2, className: "text-emerald-500" },
    失败: { icon: XCircle, className: "text-red-500" },
    错误: { icon: AlertTriangle, className: "text-amber-500" },
}

interface ExecutionReportPageProps {
    onBack?: () => void
}

export function ExecutionReportPage({ onBack }: ExecutionReportPageProps) {
    const [searchQuery, setSearchQuery] = useState("")

    return (
        <div className="space-y-6">
            {/* 返回按钮 */}
            <div>
                <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}>
                    <ArrowLeft className="size-4" />
                    返回
                </Button>
            </div>

            {/* 测试报告概览 */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-2">测试报告 #6</h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 左侧统计 */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* 统计卡片 */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                    <FileText className="size-4 text-blue-500" />
                                    <span className="text-xs">用例总数</span>
                                </div>
                                <span className="text-2xl font-semibold">3</span>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                    <CheckCircle2 className="size-4 text-emerald-500" />
                                    <span className="text-xs">成功数</span>
                                </div>
                                <span className="text-2xl font-semibold text-emerald-500">3</span>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                    <XCircle className="size-4 text-red-500" />
                                    <span className="text-xs">失败数</span>
                                </div>
                                <span className="text-2xl font-semibold text-red-500">0</span>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                    <AlertTriangle className="size-4 text-amber-500" />
                                    <span className="text-xs">错误数</span>
                                </div>
                                <span className="text-2xl font-semibold text-amber-500">0</span>
                            </div>
                        </div>

                        {/* 详细信息 */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">测试环境:</span>
                                    <Badge variant="outline" className="font-normal">fat</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">执行人:</span>
                                    <span className="text-blue-600">邻居的尾巴</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">开始时间:</span>
                                    <span>2021-08-15 00:48:27</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">执行方式:</span>
                                    <span>手动</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">测试计划:</span>
                                    <span>无</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">结束时间:</span>
                                    <span>2021-08-15 00:48:30</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">测试结果:</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0">
                                        <CheckCircle2 className="size-3 mr-1" />
                                        通过
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">用例跳过数:</span>
                                    <span>0</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">耗时:</span>
                                    <span>2.37秒</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 右侧饼图 */}
                    <ChartContainer
                        config={chartConfig}
                        className="mx-auto max-h-[280px]"
                    >
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={pieData} dataKey="value" label nameKey="name" />
                            <ChartLegend
                                content={<ChartLegendContent nameKey="name" />}
                                className="flex-wrap gap-2"
                            />
                        </PieChart>
                    </ChartContainer>
                </div>
            </Card>

            {/* 用例列表 */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">用例列表</h3>
                    <Input
                        placeholder="请输入用例名称"
                        className="w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">用例id</TableHead>
                            <TableHead>用例名称</TableHead>
                            <TableHead className="w-[100px]">重试次数</TableHead>
                            <TableHead className="w-[100px]">执行状态</TableHead>
                            <TableHead className="w-[100px]">请求方式</TableHead>
                            <TableHead className="w-[160px]">开始时间</TableHead>
                            <TableHead className="w-[160px]">结束时间</TableHead>
                            <TableHead className="w-[80px] text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {testCases.map((testCase) => {
                            const StatusIcon = statusIcons[testCase.status]?.icon || CheckCircle2
                            const iconClass = statusIcons[testCase.status]?.className || "text-emerald-500"
                            return (
                                <TableRow key={testCase.id}>
                                    <TableCell>{testCase.id}</TableCell>
                                    <TableCell>
                                        <span className="text-blue-600 hover:underline cursor-pointer">
                                            {testCase.name}
                                        </span>
                                    </TableCell>
                                    <TableCell>{testCase.retryCount}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <StatusIcon className={`size-4 ${iconClass}`} />
                                            <span>{testCase.status}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono text-xs bg-emerald-50 text-emerald-600 border-emerald-200">
                                            {testCase.method}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{testCase.startTime}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{testCase.endTime}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600">
                                            更多
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
