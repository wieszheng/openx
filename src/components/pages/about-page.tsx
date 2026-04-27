import { BookOpenText, Layers3, ShieldCheck, Sparkles, Users, Workflow } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AboutPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border bg-card/60 p-6">
        <h1 className="text-2xl font-semibold">关于 OpenX</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          OpenX 专注于企业 AI 自动化平台建设，帮助团队以低门槛方式构建高可靠流程系统。
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Users className="size-5 text-primary" />
            <CardTitle>团队协作</CardTitle>
            <CardDescription>多角色协同设计、审批与运营自动化流程。</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Workflow className="size-5 text-primary" />
            <CardTitle>流程编排</CardTitle>
            <CardDescription>可视化节点编排与策略控制，支持复杂业务。</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <BookOpenText className="size-5 text-primary" />
            <CardTitle>可持续演进</CardTitle>
            <CardDescription>覆盖文档、监控、告警与审计，保障长期可维护。</CardDescription>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardContent className="pt-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Layers3 className="size-4" /> 120+ 可复用节点
            </span>
            <span className="inline-flex items-center gap-1">
              <Sparkles className="size-4" /> 40+ 行业模板
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-4" /> 企业级权限与审计
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
