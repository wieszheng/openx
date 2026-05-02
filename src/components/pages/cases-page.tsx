import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Folder, FolderOpen, FolderTree, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react"

import { CaseEditDialog } from "@/components/case-edit-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { casesApi, directoriesApi, groupsApi } from "@/lib/api"
import type { Directory, Group, TestCase } from "@/lib/api"

function formatDate(iso: string) {
  return iso.replace("T", " ").slice(0, 19)
}

// 优先级样式配置 - 粉色玫瑰色边框标签
const PRIORITY_STYLES: Record<string, string> = {
  P0: "bg-red-100 text-red-700 border-red-200",
  P1: "bg-orange-100 text-orange-700 border-orange-200",
  P2: "bg-blue-100 text-blue-700 border-blue-200",
  P3: "bg-gray-100 text-gray-700 border-gray-200",
}

// 状态样式配置
const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  "正常运行": { dot: "bg-green-500", text: "text-slate-600" },
  "调试中": { dot: "bg-blue-500", text: "text-slate-600" },
  "已停用": { dot: "bg-slate-400", text: "text-slate-500" },
  "异常": { dot: "bg-red-500", text: "text-slate-600" },
}

export function CasesPage() {
  const navigate = useNavigate()
  // ── 数据状态 ────────────────────────────────────────────────
  const [groups, setGroups] = useState<Group[]>([])
  const [directories, setDirectories] = useState<Directory[]>([])
  const [cases, setCases] = useState<TestCase[]>([])

  // ── 分页状态 ────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const pageSize = 10

  // ── 加载状态 ────────────────────────────────────────────────
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingCases, setLoadingCases] = useState(false)

  // ── 选中状态 ────────────────────────────────────────────────
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null)
  const [activeDirId, setActiveDirId] = useState<string | null>(null)

  // ── 筛选状态 ────────────────────────────────────────────────
  const [keyword, setKeyword] = useState("")
  const [ownerFilter, setOwnerFilter] = useState("all")

  // ── 弹窗状态 ────────────────────────────────────────────────
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newFolderName, setNewFolderName] = useState("")
  const [createFolderGroupId, setCreateFolderGroupId] = useState<number | null>(null)
  const [renameFolderName, setRenameFolderName] = useState("")
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null)

  // ── 用例编辑状态 ───────────────────────────────────────────
  const [isEditCaseOpen, setIsEditCaseOpen] = useState(false)
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)

  // ── 挂载：一次性加载所有 Groups + Directories ───────────────
  useEffect(() => {
    setLoadingGroups(true)
    Promise.all([groupsApi.list(), directoriesApi.list()])
      .then(([groupData, dirData]) => {
        setGroups(groupData)
        setDirectories(dirData)
        if (groupData.length > 0) setActiveGroupId(groupData[0].id)
        if (dirData.length > 0) setActiveDirId(dirData[0].id)
      })
      .catch(console.error)
      .finally(() => setLoadingGroups(false))
  }, [])

  // ── Directory 切换：加载 Cases ──────────────────────────────
  useEffect(() => {
    if (!activeDirId) {
      setCases([])
      return
    }
    setCurrentPage(1)
    setLoadingCases(true)
    setKeyword("")
    setOwnerFilter("all")
    casesApi
      .list(activeDirId, { page: 1, page_size: pageSize })
      .then((data) => {
        setCases(data.items)
        setTotalRecords(data.total)
      })
      .catch(console.error)
      .finally(() => setLoadingCases(false))
  }, [activeDirId])

  // ── 查询 ────────────────────────────────────────────────────
  const handleSearch = () => {
    if (!activeDirId) return
    setCurrentPage(1)
    setLoadingCases(true)
    casesApi
      .list(activeDirId, {
        keyword: keyword.trim() || undefined,
        owner: ownerFilter !== "all" ? ownerFilter : undefined,
        page: 1,
        page_size: pageSize,
      })
      .then((data) => {
        setCases(data.items)
        setTotalRecords(data.total)
      })
      .catch(console.error)
      .finally(() => setLoadingCases(false))
  }

  const handleReset = () => {
    setKeyword("")
    setOwnerFilter("all")
    setCurrentPage(1)
    if (!activeDirId) return
    setLoadingCases(true)
    casesApi
      .list(activeDirId, { page: 1, page_size: pageSize })
      .then((data) => {
        setCases(data.items)
        setTotalRecords(data.total)
      })
      .catch(console.error)
      .finally(() => setLoadingCases(false))
  }

  // ── 分页切换 ────────────────────────────────────────────────
  const handlePageChange = (page: number) => {
    if (!activeDirId) return
    setCurrentPage(page)
    setLoadingCases(true)
    casesApi
      .list(activeDirId, {
        keyword: keyword.trim() || undefined,
        owner: ownerFilter !== "all" ? ownerFilter : undefined,
        page,
        page_size: pageSize,
      })
      .then((data) => {
        setCases(data.items)
        setTotalRecords(data.total)
      })
      .catch(console.error)
      .finally(() => setLoadingCases(false))
  }

  // ── 新增根目录 ──────────────────────────────────────────────
  const handleCreateGroup = async () => {
    const name = newGroupName.trim()
    if (!name) return
    try {
      const group = await groupsApi.create(name)
      setGroups((prev) => [...prev, group])
      setActiveGroupId(group.id)
    } catch (e) {
      console.error(e)
    }
    setNewGroupName("")
    setIsCreateOpen(false)
  }

  // ── 新增子目录 ──────────────────────────────────────────────
  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name || createFolderGroupId === null) return
    try {
      const dir = await directoriesApi.create({ name, group_id: createFolderGroupId })
      setDirectories((prev) => [...prev, dir])
      setActiveGroupId(createFolderGroupId)
      setActiveDirId(dir.id)
    } catch (e) {
      console.error(e)
    }
    setNewFolderName("")
    setCreateFolderGroupId(null)
    setIsCreateFolderOpen(false)
  }

  // ── 重命名目录 ──────────────────────────────────────────────
  const handleRenameFolder = async () => {
    if (!targetFolderId) return
    const name = renameFolderName.trim()
    if (!name) return
    try {
      const updated = await directoriesApi.rename(targetFolderId, name)
      setDirectories((prev) => prev.map((d) => (d.id === targetFolderId ? updated : d)))
    } catch (e) {
      console.error(e)
    }
    setTargetFolderId(null)
    setIsRenameOpen(false)
  }

  // ── 删除目录 ────────────────────────────────────────────────
  const handleDeleteFolder = async () => {
    if (!targetFolderId || directories.length <= 1) return
    const deletingDir = directories.find((d) => d.id === targetFolderId)
    if (!deletingDir) return
    try {
      await directoriesApi.delete(targetFolderId)
      const nextDirs = directories.filter((d) => d.id !== targetFolderId)
      setDirectories(nextDirs)
      const sameGroupFallback = nextDirs.find((d) => d.group_id === deletingDir.group_id)
      const nextActive = sameGroupFallback ?? nextDirs[0]
      if (nextActive) {
        setActiveGroupId(nextActive.group_id)
        setActiveDirId(nextActive.id)
      }
    } catch (e) {
      console.error(e)
    }
    setTargetFolderId(null)
    setIsDeleteOpen(false)
  }

  // ── 派生状态 ────────────────────────────────────────────────
  const activeGroup = groups.find((g) => g.id === activeGroupId)
  const activeDir = directories.find((d) => d.id === activeDirId)
  const ownerOptions = Array.from(
    new Set(cases.map((c) => c.created_by).filter(Boolean) as string[])
  )

  return (
    <section className="h-[calc(100vh-6rem)]">
      <div className="h-full overflow-hidden rounded-xl border bg-card/50">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize="24%" minSize="18%" maxSize="35%">
            <aside className="h-full p-3">
              <div className="mb-3 flex items-center gap-2 px-2 text-sm font-medium">
                <FolderTree className="size-4 text-muted-foreground" />
                项目目录
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => setIsCreateOpen(true)}
                    aria-label="新增根目录"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>

              {loadingGroups ? (
                <div className="px-2 py-4 text-xs text-muted-foreground">加载中…</div>
              ) : (
                <Accordion
                  type="single"
                  collapsible
                  value={activeGroupId !== null ? String(activeGroupId) : ""}
                  onValueChange={(value) => {
                    setActiveGroupId(value ? Number(value) : null)
                  }}
                  className="gap-1"
                >
                  {groups.map((group) => {
                    const groupDirs = directories.filter((d) => d.group_id === group.id)
                    return (
                      <AccordionItem key={group.id} value={String(group.id)} className="border-none">
                        <AccordionTrigger className="rounded-md px-2 py-2 hover:no-underline">
                          <span className="flex w-full items-center gap-2 pr-1">
                            <FolderOpen className="size-4 text-muted-foreground" />
                            <span>{group.name}</span>
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              className="ml-auto"
                              aria-label="新增子目录"
                              onClick={(event) => {
                                event.stopPropagation()
                                setCreateFolderGroupId(group.id)
                                setNewFolderName("")
                                setIsCreateFolderOpen(true)
                              }}
                            >
                              <Plus className="size-3.5 mb-1.5" />
                            </Button>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-1">
                          <div className="space-y-1 pl-6">
                            {groupDirs.map((dir) => (
                              <button
                                key={dir.id}
                                type="button"
                                onClick={() => {
                                  setActiveGroupId(group.id)
                                  setActiveDirId(dir.id)
                                }}
                                className={`group/folder relative flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm ${activeDirId === dir.id
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Folder className="size-3.5" />
                                  {dir.name}
                                </span>

                                <span className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/folder:opacity-100">
                                  <Button
                                    type="button"
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label="重命名目录"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setTargetFolderId(dir.id)
                                      setRenameFolderName(dir.name)
                                      setIsRenameOpen(true)
                                    }}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label="删除目录"
                                    disabled={directories.length <= 1}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setTargetFolderId(dir.id)
                                      setIsDeleteOpen(true)
                                    }}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </span>
                              </button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              )}
            </aside>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="76%">
            <Card className="flex h-full flex-col rounded-none border-none shadow-none">
              <CardHeader className="shrink-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>项目</span>
                  <span>/</span>
                  <span>{activeGroup?.name ?? "…"}</span>
                  <span>/</span>
                  <span className="text-foreground">{activeDir?.name ?? "…"}</span>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden pt-1">
                {/* 筛选栏 */}
                <div className="shrink-0 grid gap-3 md:grid-cols-[1.5fr_1fr_auto_auto]">
                  <Input
                    placeholder="输入用例名称"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择创建人" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部创建人</SelectItem>
                      {ownerOptions.map((owner) => (
                        <SelectItem key={owner} value={owner}>
                          {owner}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button className="gap-2" onClick={handleSearch}>
                    <Search className="size-4" />
                    查询
                  </Button>
                  <Button variant="ghost" className="gap-2" onClick={handleReset}>
                    <RotateCcw className="size-4" />
                    重置
                  </Button>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <Button
                    className="gap-2"
                    onClick={() => {
                      setEditingCase(null)
                      setIsEditCaseOpen(true)
                    }}
                  >
                    <Plus className="size-4" />
                    新建用例
                  </Button>
                </div>

                {/* 表格：flex-1 + overflow-y-auto 确保内容超出时可滚动 */}
                <div className="flex-1 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>用例名称</TableHead>
                      <TableHead>优先级</TableHead>
                      <TableHead>用例状态</TableHead>
                      <TableHead>创建人</TableHead>
                      <TableHead>更新时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingCases ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          加载中…
                        </TableCell>
                      </TableRow>
                    ) : cases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          当前筛选条件下暂无用例
                        </TableCell>
                      </TableRow>
                    ) : (
                      cases.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`font-mono ${PRIORITY_STYLES[item.priority] || "bg-gray-100"}`}
                            >
                              {item.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`size-2 rounded-full ${STATUS_STYLES[item.status]?.dot || "bg-gray-400"}`} />
                              <span className="text-sm">{item.status}</span>
                            </div>

                          </TableCell>
                          <TableCell>{item.created_by ?? "—"}</TableCell>
                          <TableCell>{formatDate(item.updated_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setEditingCase(item)
                                  setIsEditCaseOpen(true)
                                }}
                              >
                                编辑
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-primary"
                                onClick={() => navigate(`/cases/${item.id}`)}
                              >
                                查看
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>

                {/* 分页：固定在内容区底部，不随表格滚动 */}
                {totalRecords > 0 && (
                  <div className="shrink-0 flex items-center justify-between border-t px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      共 <span className="font-medium text-foreground">{totalRecords}</span> 条记录
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        上一页
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, Math.ceil(totalRecords / pageSize)) }, (_, i) => {
                          const page = i + 1
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              className="size-8"
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </Button>
                          )
                        })}
                        {Math.ceil(totalRecords / pageSize) > 5 && (
                          <>
                            <span className="px-1 text-muted-foreground">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="size-8"
                              onClick={() => handlePageChange(Math.ceil(totalRecords / pageSize))}
                            >
                              {Math.ceil(totalRecords / pageSize)}
                            </Button>
                          </>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= Math.ceil(totalRecords / pageSize)}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* 新增根目录 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增根目录</DialogTitle>
            <DialogDescription>创建一级目录分组，显示在目录树第一层。</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="请输入根目录名称"
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateGroup}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重命名目录 */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名目录</DialogTitle>
            <DialogDescription>修改当前选中目录名称。</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="请输入新目录名称"
            value={renameFolderName}
            onChange={(event) => setRenameFolderName(event.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRenameFolder}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增子目录 */}
      <Dialog
        open={isCreateFolderOpen}
        onOpenChange={(open) => {
          setIsCreateFolderOpen(open)
          if (!open) setCreateFolderGroupId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增子目录</DialogTitle>
            <DialogDescription>
              在分组「{groups.find((g) => g.id === createFolderGroupId)?.name ?? "—"}」下创建目录。
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="请输入子目录名称"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateFolder}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除目录确认 */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除目录</DialogTitle>
            <DialogDescription>
              确认删除目录「{directories.find((d) => d.id === targetFolderId)?.name ?? "—"}」？该操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteFolder}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 用例编辑弹窗 */}
      <CaseEditDialog
        open={isEditCaseOpen}
        onOpenChange={setIsEditCaseOpen}
        caseData={editingCase}
        directoryId={activeDirId || ""}
        onSuccess={(newCase) => {
          if (editingCase) {
            // 编辑模式：更新列表中的用例
            setCases((prev) => prev.map((c) => (c.id === newCase.id ? newCase : c)))
          } else {
            // 新建模式：添加到列表
            setCases((prev) => [...prev, newCase])
            setTotalRecords((prev) => prev + 1)
          }
        }}
      />
    </section>
  )
}
