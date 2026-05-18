import { useEffect, useMemo, useState } from "react"
import { Copy, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import { globalVariablesApi, type GlobalVariable, type GlobalVariableType } from "@/lib/api"

const TYPE_OPTIONS: { value: GlobalVariableType; label: string; color: string }[] = [
  { value: "string", label: "字符串", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "number", label: "数字", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "boolean", label: "布尔", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "json", label: "JSON", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "list", label: "列表", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "secret", label: "密钥", color: "bg-red-100 text-red-700 border-red-200" },
]

function getTypeStyle(varType: GlobalVariableType) {
  return TYPE_OPTIONS.find((o) => o.value === varType)?.color ?? "bg-gray-100 text-gray-700 border-gray-200"
}

function getTypeLabel(varType: GlobalVariableType) {
  return TYPE_OPTIONS.find((o) => o.value === varType)?.label ?? varType
}

function formatDate(iso: string) {
  return iso.replace("T", " ").slice(0, 19)
}

interface FormData {
  name: string
  var_type: GlobalVariableType
  value: string
  description: string
}

const INITIAL_FORM: FormData = {
  name: "",
  var_type: "string",
  value: "",
  description: "",
}

const PAGE_SIZE = 10

export function GlobalVariablesPage() {
  const [variables, setVariables] = useState<GlobalVariable[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState("")
  const [typeFilter, setTypeFilter] = useState<GlobalVariableType | "">("")
  const [showValueIds, setShowValueIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // 新建/编辑弹窗
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  // 删除确认弹窗
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchVariables = async () => {
    setLoading(true)
    try {
      const params: { page: number; page_size: number; keyword?: string; var_type?: GlobalVariableType } = {
        page: currentPage,
        page_size: PAGE_SIZE,
      }
      if (keyword.trim()) params.keyword = keyword.trim()
      if (typeFilter) params.var_type = typeFilter as GlobalVariableType
      
      const response = await globalVariablesApi.list(params)
      console.log(response)
      setVariables(response.items)
      setTotal(response.total)
      setTotalPages(response.total_pages)
    } catch {
      setVariables([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVariables()
  }, [currentPage, keyword, typeFilter])

  // 重置到第一页当筛选类型变化时
  useEffect(() => {
    setCurrentPage(1)
  }, [typeFilter])

  const pageNums = useMemo(() => {
    const half = 2
    let start = Math.max(1, currentPage - half)
    const end = Math.min(totalPages, start + 4)
    start = Math.max(1, end - 4)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [currentPage, totalPages])

  const openCreate = () => {
    setEditingId(null)
    setForm(INITIAL_FORM)
    setFormError("")
    setDialogOpen(true)
  }

  const openEdit = (v: GlobalVariable) => {
    setEditingId(v.id)
    setForm({
      name: v.name,
      var_type: v.var_type,
      value: v.value,
      description: v.description ?? "",
    })
    setFormError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("变量名称不能为空")
      return
    }
    if (form.var_type === "json") {
      try {
        JSON.parse(form.value)
      } catch {
        setFormError("JSON 格式不正确，请检查语法")
        return
      }
    }
    setSaving(true)
    setFormError("")
    try {
      if (editingId) {
        await globalVariablesApi.update(editingId, {
          name: form.name.trim(),
          var_type: form.var_type,
          value: form.value,
          description: form.description.trim() || null,
        })
      } else {
        await globalVariablesApi.create({
          name: form.name.trim(),
          var_type: form.var_type,
          value: form.value,
          description: form.description.trim() || undefined,
        })
      }
      setDialogOpen(false)
      fetchVariables()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (id: string) => {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setDeleting(true)
    try {
      await globalVariablesApi.delete(deletingId)
      setDeleteDialogOpen(false)
      fetchVariables()
    } finally {
      setDeleting(false)
    }
  }

  const toggleShowValue = (id: string) => {
    setShowValueIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const maskValue = (v: GlobalVariable) => {
    if (v.var_type === "secret") {
      return showValueIds.has(v.id) ? v.value : "••••••••"
    }
    if (v.var_type === "json" || v.var_type === "list") {
      if (!showValueIds.has(v.id)) return v.var_type === "json" ? "{ ... }" : "[ ... ]"
      try {
        return JSON.stringify(JSON.parse(v.value), null, 2)
      } catch {
        return v.value
      }
    }
    return v.value
  }

  const copyValue = async (v: GlobalVariable) => {
    await navigator.clipboard.writeText(v.value)
  }

  return (
    <div className="space-y-6">
      {/* 筛选区域 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="搜索变量名称或描述…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <Select
          value={typeFilter || "all"}
          onValueChange={(v) => setTypeFilter(v === "all" ? "" : v as GlobalVariableType)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button onClick={openCreate} className="gap-1">
            <Plus className="size-4" />
            新建变量
          </Button>
        </div>
      </div>

      {/* 数据表格 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">变量名称</TableHead>
              <TableHead className="w-[100px]">类型</TableHead>
              <TableHead>值</TableHead>
              <TableHead>描述</TableHead>
              <TableHead className="w-[160px]">更新时间</TableHead>
              <TableHead className="w-[100px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {keyword || typeFilter ? "没有找到匹配的变量" : "暂无全局变量，点击上方按钮创建"}
                </TableCell>
              </TableRow>
            ) : (
              variables.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getTypeStyle(v.var_type)}>
                      {getTypeLabel(v.var_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="truncate max-w-[200px]">{maskValue(v)}</span>
                      {(v.var_type === "secret" || v.var_type === "json" || v.var_type === "list") && (
                        <button
                          onClick={() => toggleShowValue(v.id)}
                          className="shrink-0 text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          {showValueIds.has(v.id) ? "收起" : "展开"}
                        </button>
                      )}
                      <button
                        onClick={() => copyValue(v)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        title="复制"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {v.description || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(v.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(v)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => confirmDelete(v.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* 分页器 */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-muted-foreground">共 {total} 条数据，第 {currentPage}/{totalPages} 页</span>
          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(currentPage - 1)}
                  aria-disabled={currentPage <= 1}
                  text="上一页"
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {pageNums.map((num) => (
                <PaginationItem key={num}>
                  <PaginationLink
                    isActive={num === currentPage}
                    onClick={() => setCurrentPage(num)}
                  >
                    {num}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(currentPage + 1)}
                  aria-disabled={currentPage >= totalPages}
                  text="下一页"
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑变量" : "新建变量"}</DialogTitle>
            <DialogDescription>
              {editingId ? "修改全局变量的属性" : "创建一个可在测试用例中引用的全局变量"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="gv-name">变量名称</Label>
              <Input
                id="gv-name"
                placeholder="例如：BASE_URL、API_KEY"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gv-type">类型</Label>
              <Select
                value={form.var_type}
                onValueChange={(v) => setForm((f) => ({ ...f, var_type: v as GlobalVariableType }))}
              >
                <SelectTrigger id="gv-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gv-value">
                值
                {form.var_type === "secret" && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">（将加密存储）</span>
                )}
                {form.var_type === "json" && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">（JSON 格式）</span>
                )}
              </Label>
              {form.var_type === "boolean" ? (
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    id="gv-value-bool"
                    checked={form.value === "true"}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, value: String(checked) }))}
                  />
                  <Label htmlFor="gv-value-bool" className="font-normal">
                    {form.value === "true" ? "true" : "false"}
                  </Label>
                </div>
              ) : form.var_type === "json" ? (
                <Textarea
                  id="gv-value"
                  placeholder={'{\n  "key": "value"\n}'}
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  rows={4}
                  className="font-mono text-sm"
                />
              ) : (
                <Input
                  id="gv-value"
                  placeholder="输入变量值"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gv-desc">描述（可选）</Label>
              <Textarea
                id="gv-desc"
                placeholder="描述变量的用途或注意事项"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin mr-1" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除后变量将无法恢复，正在使用该变量的测试用例可能会受影响。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin mr-1" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
