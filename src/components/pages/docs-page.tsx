import { ArrowRight, FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const docs = [
  { title: "快速开始 OpenX", tag: "入门", update: "今天" },
  { title: "工作流节点配置手册", tag: "配置", update: "2 天前" },
  { title: "连接器 API 规范", tag: "开发", update: "3 天前" },
  { title: "组织权限与审计指南", tag: "安全", update: "1 周前" },
]

export function DocsPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border bg-card/60 p-6">
        <h1 className="text-2xl font-semibold">文档中心</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          提供从入门到开发对接的完整文档，支持团队知识沉淀。
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {docs.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <FileText className="size-4" />
                <Badge variant="outline">{item.tag}</Badge>
              </div>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>最近更新：{item.update}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="h-8 px-0 text-primary">
                阅读文档
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
