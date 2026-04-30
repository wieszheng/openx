import { useEffect, useRef, useState } from "react"
import { Plus, Tag, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { casesApi } from "@/lib/api"
import type { TestCase } from "@/lib/api"

// ── 类型 ─────────────────────────────────────────────────────────────────────
interface TestStep {
  id: string
  action: string
  expected: string
}

interface CaseEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caseData?: TestCase | null
  directoryId: string
  onSuccess?: (caseItem: TestCase) => void
}

// ── 分区标题 ─────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </p>
  )
}

// ── 标签 Chip 输入 ────────────────────────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (raw: string) => {
    const trimmed = raw.trim().replace(/,+$/, "")
    if (!trimmed || tags.includes(trimmed)) { setInput(""); return }
    onChange([...tags, trimmed])
    setInput("")
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input) }
    if (e.key === "Backspace" && !input && tags.length) onChange(tags.slice(0, -1))
  }

  return (
    <div
      className="flex min-h-9 cursor-text flex-wrap items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((t) => (
        <Badge key={t} variant="secondary" className="h-5 gap-1 px-1.5 text-xs">
          <Tag className="size-2.5" />
          {t}
          <button
            type="button"
            className="ml-0.5 rounded-full opacity-60 hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onChange(tags.filter((x) => x !== t)) }}
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => addTag(input)}
        placeholder={tags.length ? "" : "输入标签，按 Enter 确认"}
        className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  )
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export function CaseEditDialog({
  open,
  onOpenChange,
  caseData,
  directoryId,
  onSuccess,
}: CaseEditDialogProps) {
  const isEdit = !!caseData
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [name, setName]                   = useState("")
  const [priority, setPriority]           = useState<"P0" | "P1" | "P2" | "P3">("P2")
  const [status, setStatus]               = useState<"正常运行" | "调试中" | "已停用">("调试中")
  const [description, setDescription]     = useState("")
  const [preconditions, setPreconditions] = useState("")
  const [steps, setSteps]                 = useState<TestStep[]>([{ id: "1", action: "", expected: "" }])
  const [expectedResult, setExpectedResult] = useState("")
  const [tags, setTags]                   = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    if (caseData) {
      setName(caseData.name)
      setPriority(caseData.priority)
      setStatus(caseData.status)
      setDescription(caseData.description || "")
      setPreconditions(caseData.preconditions || "")
      setSteps(
        caseData.steps_manual.length > 0
          ? caseData.steps_manual.map((s, i) => ({
              id: String(i + 1),
              action: (s as { action: string }).action ?? "",
              expected: (s as { expected: string }).expected ?? "",
            }))
          : [{ id: "1", action: "", expected: "" }],
      )
      setExpectedResult(caseData.expected_result || "")
      setTags(caseData.tags ?? [])
    } else {
      setName(""); setPriority("P2"); setStatus("调试中"); setDescription("")
      setPreconditions(""); setSteps([{ id: "1", action: "", expected: "" }])
      setExpectedResult(""); setTags([])
    }
    setError("")
  }, [open, caseData])

  const addStep = () =>
    setSteps((s) => [...s, { id: String(Date.now()), action: "", expected: "" }])

  const removeStep = (id: string) =>
    setSteps((s) => s.length > 1 ? s.filter((x) => x.id !== id) : s)

  const updateStep = (id: string, field: keyof TestStep, value: string) =>
    setSteps((s) => s.map((x) => x.id === id ? { ...x, [field]: value } : x))

  const handleSubmit = async () => {
    if (!name.trim()) { setError("用例名称不能为空"); return }
    setError(""); setLoading(true)
    try {
      const payload = {
        name: name.trim(), priority, status,
        description: description.trim(),
        preconditions: preconditions.trim(),
        steps_manual: steps
          .filter((s) => s.action.trim())
          .map((s, i) => ({ seq: i + 1, action: s.action.trim(), expected: s.expected.trim() })),
        expected_result: expectedResult.trim(),
        tags,
      }
      const result = isEdit && caseData
        ? await casesApi.update(caseData.id, payload)
        : await casesApi.create(directoryId, payload)
      onSuccess?.(result)
      onOpenChange(false)
    } catch (e) {
      setError((e as Error).message ?? "保存失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-full min-w-[550px] flex-col overflow-hidden">
        {/* ── 头部 ─────────────────────────────────────────────── */}
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEdit ? "编辑用例" : "新建用例"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEdit ? "修改用例信息后点击保存" : "填写用例信息，带 * 为必填"}
          </DialogDescription>
        </DialogHeader>

        {/* ── 可滚动内容区 ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-6 p-1">
          {/* 基本信息 */}
          <div>
            <SectionLabel>基本信息</SectionLabel>
            <div className="space-y-4">
              {/* 名称 */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm">
                  用例名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError("") }}
                  placeholder="简明描述本用例验证的功能点"
                  className={error ? "border-destructive" : ""}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              {/* 优先级 + 状态 并排两列 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="priority" className="text-sm">优先级</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P0">P0 紧急</SelectItem>
                      <SelectItem value="P1">P1 高</SelectItem>
                      <SelectItem value="P2">P2 中</SelectItem>
                      <SelectItem value="P3">P3 低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-sm">用例状态</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="正常运行">
                        <span className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          正常运行
                        </span>
                      </SelectItem>
                      <SelectItem value="调试中">
                        <span className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-blue-500" />
                          调试中
                        </span>
                      </SelectItem>
                      <SelectItem value="已停用">
                        <span className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-slate-400" />
                          已停用
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 标签 */}
              <div className="space-y-1.5">
                <Label className="text-sm">标签</Label>
                <TagInput tags={tags} onChange={setTags} />
                <p className="text-[11px] text-muted-foreground/60">按 Enter 或逗号确认标签</p>
              </div>
            </div>
          </div>

          {/* 用例内容 */}
          <div>
            <SectionLabel>用例内容</SectionLabel>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm">用例描述</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简要描述本用例的测试目的与覆盖范围"
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="preconditions" className="text-sm">前置条件</Label>
                  <Textarea
                    id="preconditions"
                    value={preconditions}
                    onChange={(e) => setPreconditions(e.target.value)}
                    placeholder="执行前需满足的环境/数据条件"
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expectedResult" className="text-sm">预期结果</Label>
                  <Textarea
                    id="expectedResult"
                    value={expectedResult}
                    onChange={(e) => setExpectedResult(e.target.value)}
                    placeholder="整体预期结果描述"
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 测试步骤 */}
          <div className="flex flex-col min-h-0">
            <div className="mb-3">
              <SectionLabel>测试步骤</SectionLabel>
            </div>

            {/* 表头 */}
            <div className="grid grid-cols-[24px_1fr_1fr_28px] items-center gap-2 px-1 mb-1">
              <span />
              <span className="text-[11px] font-medium text-muted-foreground">操作步骤</span>
              <span className="text-[11px] font-medium text-muted-foreground">预期结果</span>
              <span />
            </div>

            {/* 步骤列表固定高度滚动区 */}
            <div className="h-[200px] overflow-y-auto space-y-1.5 pr-1">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="grid grid-cols-[24px_1fr_1fr_28px] items-center gap-2"
                >
                  {/* 序号 */}
                  <div className="flex h-8 items-center justify-center">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary ring-1 ring-primary/20">
                      {index + 1}
                    </span>
                  </div>
                  {/* 操作 */}
                  <Input
                    value={step.action}
                    onChange={(e) => updateStep(step.id, "action", e.target.value)}
                    placeholder="执行的具体操作"
                    className="h-8 text-sm"
                  />
                  {/* 预期 */}
                  <Input
                    value={step.expected}
                    onChange={(e) => updateStep(step.id, "expected", e.target.value)}
                    placeholder="该步骤预期结果"
                    className="h-8 text-sm"
                  />
                  {/* 删除 */}
                  <div className="flex h-8 items-center justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive disabled:opacity-0"
                      disabled={steps.length <= 1}
                      onClick={() => removeStep(step.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex justify-center pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 border-dashed text-xs text-muted-foreground hover:text-foreground"
                  onClick={addStep}
                >
                  <Plus className="size-3.5" />
                  添加步骤
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 底部操作 ─────────────────────────────────────────── */}
        <DialogFooter className="border-t px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {steps.filter((s) => s.action.trim()).length} 个步骤 · {tags.length} 个标签
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={loading || !name.trim()}>
                {loading ? "保存中…" : isEdit ? "保存" : "创建用例"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
