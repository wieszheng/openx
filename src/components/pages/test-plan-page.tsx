import { useState } from "react"
import { Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { TestPlanCreateDialog } from "@/components/test-plan-create-dialog"

const mockData = [
  {
    id: "1",
    project: "测试项目",
    name: "测试计划测试",
    priority: "P1",
    cron: "*/10 * * * *",
    sequential: false,
    caseCount: 1,
    status: "等待中",
    creator: "有敌哥",
  },
  {
    id: "2",
    project: "订单系统",
    name: "订单自动化测试",
    priority: "P0",
    cron: "0 2 * * *",
    sequential: true,
    caseCount: 15,
    status: "运行中",
    creator: "李明",
  },
  {
    id: "3",
    project: "支付系统",
    name: "支付接口测试",
    priority: "P1",
    cron: "0 */6 * * *",
    sequential: false,
    caseCount: 8,
    status: "已暂停",
    creator: "王芳",
  },
  {
    id: "4",
    project: "用户中心",
    name: "用户注册流程测试",
    priority: "P2",
    cron: "0 9 * * 1-5",
    sequential: true,
    caseCount: 5,
    status: "等待中",
    creator: "张伟",
  },
]

const priorityColors: Record<string, string> = {
  P0: "bg-red-100 text-red-700 border-red-200",
  P1: "bg-orange-100 text-orange-700 border-orange-200",
  P2: "bg-blue-100 text-blue-700 border-blue-200",
  P3: "bg-gray-100 text-gray-700 border-gray-200",
}

const statusColors: Record<string, string> = {
  等待中: "bg-amber-500",
  运行中: "bg-emerald-500",
  已暂停: "bg-gray-400",
  已完成: "bg-blue-500",
}

export function TestPlanPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const totalPages = 5
  const totalRecords = 42

  return (
    <div className="space-y-4">
      {/* 添加计划弹窗 */}
      <TestPlanCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      {/* 筛选区域 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">项目:</label>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="选择项目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="test">测试项目</SelectItem>
                <SelectItem value="order">订单系统</SelectItem>
                <SelectItem value="payment">支付系统</SelectItem>
                <SelectItem value="user">用户中心</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">名称:</label>
            <Input
              placeholder="输入测试计划名称"
              className="w-[200px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">优先级:</label>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="选择优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="P0">P0</SelectItem>
                <SelectItem value="P1">P1</SelectItem>
                <SelectItem value="P2">P2</SelectItem>
                <SelectItem value="P3">P3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">创建人:</label>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="选择创建人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="liming">李明</SelectItem>
                <SelectItem value="wangfang">王芳</SelectItem>
                <SelectItem value="zhangwei">张伟</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto">
            <Button className="gap-1" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              添加计划
            </Button>
          </div>
        </div>
      </Card>

      {/* 数据表格 */}
      <Card>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">项目</TableHead>
                <TableHead>测试计划</TableHead>
                <TableHead className="w-[100px]">优先级</TableHead>
                <TableHead className="w-[140px]">cron表达式</TableHead>
                <TableHead className="w-[100px]">顺序执行</TableHead>
                <TableHead className="w-[100px]">用例数量</TableHead>
                <TableHead className="w-[120px]">状态</TableHead>
                <TableHead className="w-[100px]">创建人</TableHead>
                <TableHead className="w-[120px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="text-blue-600 hover:underline cursor-pointer">
                      {row.project}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-mono ${priorityColors[row.priority] || "bg-gray-100"}`}
                    >
                      {row.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {row.cron}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className={row.sequential ? "text-emerald-600" : "text-gray-500"}>
                      {row.sequential ? "是" : "否"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {row.caseCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${statusColors[row.status] || "bg-gray-400"}`} />
                      <span className="text-sm">{row.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>{row.creator}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-600">
                        编辑
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600">
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

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
