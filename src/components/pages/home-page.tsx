import { AlertTriangle, ArrowRight, Bot, CheckCircle2, Clock3, PlayCircle, ShieldCheck, Zap } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const quickEntries = [
  {
    title: "快速创建自动化",
    description: "通过可视化编排，在 5 分钟内发布第一条工作流。",
    icon: Zap,
  },
  {
    title: "用例中心",
    description: "查看推荐模板，快速复用高频业务场景的最佳实践。",
    icon: PlayCircle,
  },
  {
    title: "安全与审计",
    description: "统一查看执行日志、权限策略与异常告警记录。",
    icon: ShieldCheck,
  },
]

const activityLogs = [
  { title: "工作流「订单异常预警」执行成功", time: "1 分钟前", result: "success" },
  { title: "工作流「客户召回触达」等待审批", time: "9 分钟前", result: "pending" },
]

const alerts = [
  {
    level: "高",
    message: "自动化节点「OCR 服务」错误率高于 5%，建议回滚至稳定版本。",
    time: "刚刚",
  },
  {
    level: "中",
    message: "连接器「CRM 同步」即将到达 API 调用上限，请检查配额。",
    time: "12 分钟前",
  },

]

export function HomePage() {
  return (
    <>
      <section className="grid gap-6 rounded-2xl border bg-card/60 p-6 md:grid-cols-[1.3fr_1fr] md:p-8">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <Bot className="size-3.5" />
            OpenX AI 工作流中枢
          </div>
          <h1 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
            构建稳定、可观测、可复用的企业级自动化平台
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            统一接入模型、工具与业务系统，让团队通过可视化流程快速落地自动化能力，
            同时确保执行安全与质量可追踪。
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button className="gap-2">
              开始创建
              <ArrowRight className="size-4" />
            </Button>
            <Button variant="outline">查看演示</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card size="sm">
            <CardHeader className="pb-0">
              <CardDescription>自动化任务</CardDescription>
              <CardTitle className="text-2xl">1,284</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">近 24 小时 +18.6%</CardContent>
          </Card>
          <Card size="sm">
            <CardHeader className="pb-0">
              <CardDescription>成功率</CardDescription>
              <CardTitle className="text-2xl">99.2%</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">异常率持续下降</CardContent>
          </Card>
          <Card size="sm" className="col-span-2">
            <CardHeader className="pb-0">
              <CardDescription>正在运行</CardDescription>
              <CardTitle>AI 客服工单分派流程</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              最近执行时间：刚刚 · 平均耗时 12s
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {quickEntries.map((entry) => (
          <Card key={entry.title} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="mb-2 inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <entry.icon className="size-4" />
              </div>
              <CardTitle>{entry.title}</CardTitle>
              <CardDescription>{entry.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="h-8 px-0 text-sm text-primary">
                进入模块
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>最近执行记录</CardTitle>
            <CardDescription>用于快速判断当前整体运行健康度。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityLogs.map((log) => (
              <div key={log.title} className="flex items-start gap-2 rounded-lg border p-3">
                {log.result === "success" ? (
                  <CheckCircle2 className="mt-0.5 size-4 text-emerald-500" />
                ) : log.result === "pending" ? (
                  <Clock3 className="mt-0.5 size-4 text-amber-500" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 text-destructive" />
                )}
                <div className="space-y-1">
                  <p className="text-sm leading-5">{log.title}</p>
                  <p className="text-xs text-muted-foreground">{log.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle>系统告警</CardTitle>
            <CardDescription>当前需要关注的风险与资源提醒。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.message} className="rounded-lg border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <Badge
                    variant={
                      alert.level === "高"
                        ? "destructive"
                        : alert.level === "中"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {alert.level}优先级
                  </Badge>
                  <span className="text-xs text-muted-foreground">{alert.time}</span>
                </div>
                <p className="text-sm leading-5 text-muted-foreground">{alert.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  )
}
