import { useState } from "react"
import { User, ListChecks, Bell, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

interface TestPlanCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const testCases = [
  { id: "1", name: "用户登录测试", module: "用户中心" },
  { id: "2", name: "订单创建测试", module: "订单系统" },
  { id: "3", name: "支付流程测试", module: "支付系统" },
  { id: "4", name: "退款申请测试", module: "支付系统" },
  { id: "5", name: "商品搜索测试", module: "商品系统" },
  { id: "6", name: "购物车操作测试", module: "商品系统" },
]

export function TestPlanCreateDialog({ open, onOpenChange }: TestPlanCreateDialogProps) {
  const [activeTab, setActiveTab] = useState("basic")
  const [selectedCases, setSelectedCases] = useState<string[]>([])

  const handleNext = () => {
    if (activeTab === "basic") setActiveTab("cases")
    else if (activeTab === "cases") setActiveTab("notification")
  }

  const toggleCase = (caseId: string) => {
    setSelectedCases(prev =>
      prev.includes(caseId)
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>添加测试计划</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
            <TabsTrigger value="basic" className="gap-2 data-[state=active]:bg-background">
              <User className="size-4" />
              基础信息
            </TabsTrigger>
            <TabsTrigger value="cases" className="gap-2 data-[state=active]:bg-background">
              <ListChecks className="size-4" />
              选择用例
              {selectedCases.length > 0 && (
                <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                  {selectedCases.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notification" className="gap-2 data-[state=active]:bg-background">
              <Bell className="size-4" />
              通知设置
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="basic" className="h-full mt-0 pt-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-red-500">* 项目:</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择项目" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">测试项目</SelectItem>
                      <SelectItem value="order">订单系统</SelectItem>
                      <SelectItem value="payment">支付系统</SelectItem>
                      <SelectItem value="user">用户中心</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-red-500">* 计划名称:</Label>
                  <Input placeholder="输入测试计划名称" />
                </div>

                <div className="space-y-2">
                  <Label className="text-red-500">* 运行环境:</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择要运行的环境" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dev">开发环境</SelectItem>
                      <SelectItem value="test">测试环境</SelectItem>
                      <SelectItem value="staging">预发布环境</SelectItem>
                      <SelectItem value="prod">生产环境</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-red-500">* 优先级:</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择优先级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P0">P0 - 最高</SelectItem>
                      <SelectItem value="P1">P1 - 高</SelectItem>
                      <SelectItem value="P2">P2 - 中</SelectItem>
                      <SelectItem value="P3">P3 - 低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-red-500">* cron表达式:</Label>
                  <Input placeholder="请输入测试计划的执行cron表达式" />
                </div>

                <div className="space-y-2">
                  <Label className="text-red-500">* 顺序执行:</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="是否需要顺序执行" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">是</SelectItem>
                      <SelectItem value="no">否</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-red-500">* 合格率(%):</Label>
                  <Input type="number" placeholder="请输入测试计划的最低通过率" min={0} max={100} />
                </div>

                <div className="space-y-2">
                  <Label>重试等待(min):</Label>
                  <Input type="number" placeholder="重试等待时间,不填则不重试" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="cases" className="h-full mt-0 pt-4 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    已选择 <span className="font-medium text-foreground">{selectedCases.length}</span> 个用例
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedCases(testCases.map(c => c.id))}>
                      全选
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedCases([])}>
                      清空
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg divide-y">
                  {testCases.map((testCase) => (
                    <div
                      key={testCase.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedCases.includes(testCase.id)}
                        onCheckedChange={() => toggleCase(testCase.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{testCase.name}</p>
                        <p className="text-xs text-muted-foreground">{testCase.module}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notification" className="h-full mt-0 pt-4 overflow-y-auto">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>通知方式</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox id="email" />
                      <label htmlFor="email" className="text-sm">邮件通知</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="dingtalk" />
                      <label htmlFor="dingtalk" className="text-sm">钉钉通知</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="wecom" />
                      <label htmlFor="wecom" className="text-sm">企业微信</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>通知接收人</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择通知接收人" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creator">创建人</SelectItem>
                      <SelectItem value="all">所有成员</SelectItem>
                      <SelectItem value="custom">自定义</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>触发条件</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="on-fail" />
                      <label htmlFor="on-fail" className="text-sm">测试失败时通知</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="on-success" />
                      <label htmlFor="on-success" className="text-sm">测试成功时通知</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="on-complete" defaultChecked />
                      <label htmlFor="on-complete" className="text-sm">测试完成时通知</label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {activeTab !== "notification" ? (
            <Button onClick={handleNext} className="gap-1">
              下一步
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              保存
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
