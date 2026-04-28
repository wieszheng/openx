import { CalendarIcon, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const mockData = [
    {
        id: "#1247",
        executor: "李明",
        total: 150,
        success: 148,
        failed: 1,
        error: 0,
        skipped: 1,
        startTime: "2026-04-28 09:30:15",
        endTime: "2026-04-28 09:32:45",
        status: "成功",
        action: "查看",
    },
    {
        id: "#1246",
        executor: "王芳",
        total: 85,
        success: 82,
        failed: 2,
        error: 1,
        skipped: 0,
        startTime: "2026-04-28 09:15:00",
        endTime: "2026-04-28 09:18:30",
        status: "部分失败",
        action: "查看",
    },
    {
        id: "#1245",
        executor: "张伟",
        total: 200,
        success: 200,
        failed: 0,
        error: 0,
        skipped: 0,
        startTime: "2026-04-28 08:45:00",
        endTime: "2026-04-28 08:50:20",
        status: "成功",
        action: "查看",
    },
    {
        id: "#1244",
        executor: "李明",
        total: 150,
        success: 150,
        failed: 0,
        error: 0,
        skipped: 0,
        startTime: "2026-04-28 08:00:00",
        endTime: "2026-04-28 08:05:15",
        status: "成功",
        action: "查看",
    },
    {
        id: "#1243",
        executor: "刘洋",
        total: 95,
        success: 0,
        failed: 95,
        error: 0,
        skipped: 0,
        startTime: "2026-04-28 07:30:00",
        endTime: "2026-04-28 07:32:10",
        status: "失败",
        action: "查看",
    },
    {
        id: "#1242",
        executor: "王芳",
        total: 120,
        success: 118,
        failed: 2,
        error: 0,
        skipped: 0,
        startTime: "2026-04-27 18:20:00",
        endTime: "2026-04-27 18:25:45",
        status: "部分失败",
        action: "查看",
    },
    {
        id: "#1241",
        executor: "张伟",
        total: 180,
        success: 175,
        failed: 3,
        error: 2,
        skipped: 0,
        startTime: "2026-04-27 17:00:00",
        endTime: "2026-04-27 17:08:30",
        status: "部分失败",
        action: "查看",
    },
    {
        id: "#1240",
        executor: "李明",
        total: 100,
        success: 100,
        failed: 0,
        error: 0,
        skipped: 0,
        startTime: "2026-04-27 16:30:00",
        endTime: "2026-04-27 16:35:20",
        status: "成功",
        action: "查看",
    },
]

const statusIcons = {
    成功: { icon: CheckCircle2, className: "text-emerald-500" },
    失败: { icon: XCircle, className: "text-red-500" },
    部分失败: { icon: AlertCircle, className: "text-amber-500" },
}

const statusColors: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
    成功: "outline",
    失败: "destructive",
    部分失败: "secondary",
}

interface BuildHistoryPageProps {
  onView?: (page: string) => void
}

export function BuildHistoryPage({ onView }: BuildHistoryPageProps) {
  const [currentPage, setCurrentPage] = useState(1)
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const totalPages = 10
    const totalRecords = 87

    return (
        <div className="space-y-6">
            {/* 筛选卡片 */}
            <Card className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium whitespace-nowrap">执行人</label>
                        <Select defaultValue="all">
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="请选择执行人" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全部</SelectItem>
                                <SelectItem value="liming">李明</SelectItem>
                                <SelectItem value="wangfang">王芳</SelectItem>
                                <SelectItem value="zhangwei">张伟</SelectItem>
                                <SelectItem value="liuyang">刘洋</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium whitespace-nowrap">执行时间</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-[280px] justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "yyyy-MM-dd", { locale: zhCN })} -{" "}
                                                {format(dateRange.to, "yyyy-MM-dd", { locale: zhCN })}
                                            </>
                                        ) : (
                                            format(dateRange.from, "yyyy-MM-dd", { locale: zhCN })
                                        )
                                    ) : (
                                        <span className="text-muted-foreground">选择日期范围</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    locale={zhCN}
                                    mode="range"
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <Button variant="outline">重置</Button>
                        <Button>查询</Button>
                    </div>
                </div>
            </Card>

            {/* 数据表格 */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">构建 ID</TableHead>
                            <TableHead>执行人</TableHead>
                            <TableHead className="text-center">执行总数</TableHead>
                            <TableHead className="text-center">成功</TableHead>
                            <TableHead className="text-center">失败</TableHead>
                            <TableHead className="text-center">出错</TableHead>
                            <TableHead className="text-center">跳过</TableHead>
                            <TableHead className="w-[150px]">开始时间</TableHead>
                            <TableHead className="w-[150px]">结束时间</TableHead>
                            <TableHead className="w-[100px]">任务状态</TableHead>
                            <TableHead className="w-[80px] text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockData.map((row) => {
                            const IconComponent = statusIcons[row.status].icon
                            const iconClassName = statusIcons[row.status].className
                            return (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <div className="flex items-center gap-1.5">
                                        <IconComponent className={`size-4 ${iconClassName}`} />
                                        <span className="font-medium text-primary">{row.id}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{row.executor}</TableCell>
                                <TableCell className="text-center">
                                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                        {row.total}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-medium text-emerald-600">
                                        {row.success}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-red-500/10 text-xs font-medium text-red-600">
                                        {row.failed}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-amber-500/10 text-xs font-medium text-amber-600">
                                        {row.error}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-blue-200/50 text-xs font-medium text-blue-600">
                                        {row.skipped}
                                    </span>
                                </TableCell>
                                <TableCell className="text-sm">{row.startTime}</TableCell>
                                <TableCell className="text-sm">{row.endTime}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className={`size-2 rounded-full ${
                                            row.status === "成功" ? "bg-emerald-500" :
                                            row.status === "失败" ? "bg-red-500" :
                                            "bg-amber-500"
                                        }`} />
                                        <span className="text-sm">{row.status}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2 text-primary"
                                        onClick={() => onView?.("执行报告")}
                                    >
                                        {row.action}
                                    </Button>
                                </TableCell>
                            </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>

                {/* 分页 */}
                <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                        共 <span className="font-medium text-foreground">{totalRecords}</span> 条记录
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            上一页
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const page = i + 1
                                return (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        size="sm"
                                        className="size-8"
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </Button>
                                )
                            })}
                            {totalPages > 5 && (
                                <>
                                    <span className="px-1 text-muted-foreground">...</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="size-8"
                                        onClick={() => setCurrentPage(totalPages)}
                                    >
                                        {totalPages}
                                    </Button>
                                </>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            下一页
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
