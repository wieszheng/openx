import { useState } from "react"
import {
  X, Trash2,
  AlertCircle, Settings2,
  MousePointer2, Key, Type, ScanText,
  Smartphone, Eye, Check, X as XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { configPanelRegistry } from "./node-registry"
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  NODE_KIND_TO_CATEGORY,
  type NodeKind,
  type AnyNodeData,
} from "./types"

// ─── Mock 执行日志 ─────────────────────────────────────────
const MOCK_LOGS: { time: string; level: "info" | "success" | "error"; msg: string }[] = [
  { time: "22:16:28", level: "info", msg: "开始执行节点" },
  { time: "22:16:30", level: "success", msg: "执行成功，状态码 200" },
  { time: "22:16:31", level: "info", msg: "响应耗时 1.2s" },
  { time: "22:16:33", level: "success", msg: "数据验证通过" },
]

const LOG_STYLES = {
  info: { dot: "bg-blue-500", text: "text-muted-foreground" },
  success: { dot: "bg-emerald-500", text: "text-foreground/80" },
  error: { dot: "bg-red-500", text: "text-red-500" },
}

// ─── Mock 元素数据 ─────────────────────────────────────────
const MOCK_ELEMENTS = {
  total: 109,
  clickable: 38,
  withKey: 27,
  withText: 49,
  ocr: 17,
}

const MOCK_SELECTED_ELEMENT = {
  type: "genericContainer",
  tags: ["DOM", "clickable"],
  hitLevel: 2,
  hitNodes: [
    { id: 1, name: "genericContainer", selected: true },
    { id: 2, name: "Text", desc: "[图片]", score: 25 },
  ],
  properties: [
    { label: "type", value: "genericContainer", type: "code" },
    { label: "key", value: "(无)", type: "text" },
    { label: "text", value: "(无)", type: "text" },
    { label: "bounds", value: "[77,1725][1239,2043]", type: "code" },
    { label: "size", value: "1162 × 318 px", type: "code" },
    { label: "center", value: "(658, 1884)", type: "code" },
    { label: "clickable", value: "true", type: "boolean" },
    { label: "enabled", value: "true", type: "boolean" },
    { label: "visible", value: "true", type: "boolean" },
    { label: "depth", value: "29", type: "code" },
  ],
  locators: [
    { type: "DOM", value: "无稳定标识", status: "warning" },
    { type: "视觉", value: "template[1162×318]", status: "success" },
    { type: "OCR", value: "无交叉文字", status: "warning" },
  ],
  score: 40,
  checks: [
    { label: "clickable", score: 40, pass: true },
    { label: "无 key", score: 0, pass: false },
    { label: "面积过大", score: 0, pass: false },
  ],
}

type ConfigPanelProps = {
  node: { id: string; type: string; data: AnyNodeData } | null
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
  onUpdate: (id: string, data: Partial<AnyNodeData>) => void
}

export function ConfigPanel({ node, isOpen, onClose, onDelete, onUpdate }: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState("config")

  // 元素面板筛选状态
  const [filters, setFilters] = useState({
    dom: true,
    ocr: false,
    clickable: false,
    withKey: false,
    withText: false,
  })

  const PanelContent = node?.type
    ? configPanelRegistry[node.type as NodeKind]
    : null

  const category = node ? NODE_KIND_TO_CATEGORY[node.type as NodeKind] : null
  const style = category ? CATEGORY_STYLES[category] : null
  const categoryLabel = category ? CATEGORY_LABELS[category] : ""

  return (
    <div
      className={cn(
        "absolute right-0 top-0 h-full z-20 w-[300px] transition-all duration-300 flex flex-col",
        isOpen && node
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0 pointer-events-none",
      )}
    >
      {/* 侧边面板主体 */}
      <div className="flex flex-col h-full border-l bg-background backdrop-blur-sm shadow-sm rounded-l-md">

        {/* ── 顶部标题栏 ── */}
        <div className={cn(
          "shrink-0 flex items-center gap-3 px-4 py-3 ",
        )}>
          {/* 分类色标 */}
          <div className="flex shrink-0 items-center justify-center rounded-lg">
            <Settings2 className="size-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none truncate">
              设置
            </p>
            {categoryLabel && (
              <p className={cn("mt-1 text-xs leading-none", style?.labelText ?? "text-muted-foreground")}>
                {categoryLabel}
              </p>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={onDelete}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">删除节点</TooltipContent>
            </Tooltip>
            <Button
              size="icon-xs"
              variant="ghost"
              className="size-7 text-muted-foreground"
              onClick={onClose}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Tab 切换 ── */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="min-h-0 p-2.5"
        >
          <TabsList className="w-full">
            <TabsTrigger value="config" className="text-xs">
              节点配置
            </TabsTrigger>
            <TabsTrigger value="elements" className="text-xs">
              元素
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">
              执行日志
            </TabsTrigger>
          </TabsList>

          {/* ── 内容区 ── */}
          <ScrollArea className="min-h-0 p-1">
            <TabsContent value="config">
                {PanelContent && node ? (
                  <PanelContent node={node} onUpdate={onUpdate} />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <AlertCircle className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">未选中节点</p>
                  </div>
                )}
            </TabsContent>

            <TabsContent value="elements">
              <div className="flex flex-col h-full">
                {/* DOM 筛选区域 */}
                <div className="p-1 space-y-3 border-b">
                  {/* 主要筛选 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />
                        <span className="text-xs font-medium">DOM 节点</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{MOCK_ELEMENTS.total}</span>
                        <Switch
                          checked={filters.dom}
                          onCheckedChange={(v) => setFilters(f => ({ ...f, dom: v }))}
                          className="data-[state=checked]:bg-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ScanText className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-medium">OCR 识别</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{MOCK_ELEMENTS.ocr}</span>
                        <Switch
                          checked={filters.ocr}
                          onCheckedChange={(v) => setFilters(f => ({ ...f, ocr: v }))}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* DOM 筛选 */}
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-2">DOM 筛选</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MousePointer2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs">可点击</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{MOCK_ELEMENTS.clickable}</span>
                          <Switch
                            checked={filters.clickable}
                            onCheckedChange={(v) => setFilters(f => ({ ...f, clickable: v }))}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs">有 key</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{MOCK_ELEMENTS.withKey}</span>
                          <Switch
                            checked={filters.withKey}
                            onCheckedChange={(v) => setFilters(f => ({ ...f, withKey: v }))}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Type className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs">有文本</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{MOCK_ELEMENTS.withText}</span>
                          <Switch
                            checked={filters.withText}
                            onCheckedChange={(v) => setFilters(f => ({ ...f, withText: v }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 预览区域 */}
                <div className="mt-3 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">屏幕预览</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5">
                      <Eye className="w-3 h-3 mr-1" />
                      预览模式
                    </Badge>
                  </div>
                  <div className="aspect-[9/19] bg-muted rounded-lg border flex items-center justify-center">
                    <div className="text-center">
                      <Smartphone className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">截图预览区域</p>
                      <p className="text-[10px] text-muted-foreground/60">375 × 812</p>
                    </div>
                  </div>
                </div>

                {/* 选中元素详情 */}
                <div className="mt-3 space-y-3">
                  {/* 标题和标签 */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{MOCK_SELECTED_ELEMENT.type}</h4>
                    <div className="flex flex-wrap gap-1">
                      {MOCK_SELECTED_ELEMENT.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={tag === "DOM" ? "default" : "secondary"}
                          className="text-[10px] h-5"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 命中层级 */}
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      命中层级 · {MOCK_SELECTED_ELEMENT.hitLevel} 个节点
                    </p>
                    <div className="space-y-1">
                      {MOCK_SELECTED_ELEMENT.hitNodes.map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-md text-xs",
                            n.selected ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-4">{n.id}</span>
                            <span className={cn(n.selected && "font-medium")}>{n.name}</span>
                          </div>
                          {n.desc && <span className="text-[10px] text-muted-foreground">{n.desc}</span>}
                          {n.score !== undefined && (
                            <span className="text-[10px] text-muted-foreground">{n.score}分</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* 组件属性 */}
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-2">组件属性</p>
                    <div className="space-y-1.5">
                      {MOCK_SELECTED_ELEMENT.properties.map((prop) => (
                        <div key={prop.label} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{prop.label}</span>
                          {prop.type === "boolean" ? (
                            <span className={cn(
                              "font-medium",
                              prop.value === "true" ? "text-emerald-500" : "text-red-500"
                            )}>
                              {prop.value}
                            </span>
                          ) : prop.type === "code" ? (
                            <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{prop.value}</code>
                          ) : (
                            <span className="text-muted-foreground">{prop.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* 三层定位器 */}
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-2">三层定位器</p>
                    <div className="space-y-1.5">
                      {MOCK_SELECTED_ELEMENT.locators.map((loc) => (
                        <div key={loc.type} className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] h-5 shrink-0",
                              loc.type === "DOM" && "border-blue-500/50 text-blue-500",
                              loc.type === "视觉" && "border-emerald-500/50 text-emerald-500",
                              loc.type === "OCR" && "border-amber-500/50 text-amber-500"
                            )}
                          >
                            {loc.type}
                          </Badge>
                          <span className={cn(
                            "text-xs truncate",
                            loc.status === "warning" ? "text-muted-foreground" : "text-foreground"
                          )}>
                            {loc.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* 智能评分 */}
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-2">智能评分 · {MOCK_SELECTED_ELEMENT.score}分</p>
                    <div className="space-y-1.5">
                      {MOCK_SELECTED_ELEMENT.checks.map((check) => (
                        <div key={check.label} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            {check.pass ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <XIcon className="w-3.5 h-3.5 text-red-500" />
                            )}
                            <span className={cn(!check.pass && "text-muted-foreground")}>{check.label}</span>
                          </div>
                          {check.score > 0 && (
                            <span className="text-emerald-500">(+{check.score})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="m-0 mt-0">
              <div className="p-4 space-y-3">
                {/* 日志列表 */}
                <div className="space-y-0.5">
                  {MOCK_LOGS.map((log, i) => {
                    const ls = LOG_STYLES[log.level]
                    return (
                      <div key={i} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
                        <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", ls.dot)} />
                        <span className="shrink-0 text-[10px] font-mono text-muted-foreground/60">{log.time}</span>
                        <span className={cn("text-xs leading-relaxed", ls.text)}>{log.msg}</span>
                      </div>
                    )
                  })}
                </div>

                <Separator />

                {/* 最近一次执行摘要 */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">最近执行</p>
                  {[
                    { label: "开始时间", value: "22:16:28" },
                    { label: "结束时间", value: "22:16:33" },
                    { label: "执行结果", value: "成功", cls: "text-emerald-600 font-medium" },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={cls}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  )
}
