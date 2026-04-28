import { useMemo, useState } from "react"
import { Folder, FolderOpen, FolderTree, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react"

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

type CaseItem = {
  id: string
  name: string
  method: "Http" | "MQ" | "RPC"
  priority: "P0" | "P1" | "P2"
  status: "正常运行" | "调试中" | "已停用"
  owner: string
  updatedAt: string
}

type CaseFolder = {
  id: string
  name: string
  groupId: string
  cases: CaseItem[]
}

type CaseGroup = {
  id: string
  name: string
}

const initialCaseGroups: CaseGroup[] = [
  { id: "test", name: "test" },
  { id: "support", name: "客服服务" },
  { id: "ops", name: "运营增长" },
]

const caseFolders: CaseFolder[] = [
  {
    id: "new-dev",
    name: "new发",
    groupId: "test",
    cases: [
      {
        id: "28",
        name: "查询不存在的用户",
        method: "Http",
        priority: "P0",
        status: "正常运行",
        owner: "有故哥",
        updatedAt: "2021-08-07 23:34:16",
      },
      {
        id: "29",
        name: "查询存在的用户",
        method: "Http",
        priority: "P0",
        status: "正常运行",
        owner: "有故哥",
        updatedAt: "2021-08-07 23:34:16",
      },
      {
        id: "27",
        name: "查询所有用户列表",
        method: "Http",
        priority: "P0",
        status: "正常运行",
        owner: "有故哥",
        updatedAt: "2021-08-16 23:27:44",
      },
      {
        id: "26",
        name: "正常用户登录",
        method: "Http",
        priority: "P0",
        status: "调试中",
        owner: "有故哥",
        updatedAt: "2021-08-01 17:33:26",
      },
    ],
  },
  {
    id: "day-report",
    name: "发个日文联报",
    groupId: "test",
    cases: [],
  },
  {
    id: "good-story",
    name: "好的无故事",
    groupId: "test",
    cases: [],
  },
  {
    id: "customer-routing",
    name: "智能分流",
    groupId: "support",
    cases: [
      {
        id: "41",
        name: "高优先级客户直达专席",
        method: "RPC",
        priority: "P1",
        status: "正常运行",
        owner: "客服中心",
        updatedAt: "2026-04-27 21:10:03",
      },
    ],
  },
  {
    id: "vip-line",
    name: "VIP 专线",
    groupId: "support",
    cases: [],
  },
  {
    id: "recall-touch",
    name: "召回触达",
    groupId: "ops",
    cases: [],
  },
  {
    id: "ad-feedback",
    name: "投放回传",
    groupId: "ops",
    cases: [],
  },
]

export function CasesPage() {
  const [groups, setGroups] = useState(initialCaseGroups)
  const [activeGroupId, setActiveGroupId] = useState(initialCaseGroups[0].id)
  const [folders, setFolders] = useState(caseFolders)
  const [activeFolderId, setActiveFolderId] = useState(caseFolders[0].id)
  const [keyword, setKeyword] = useState("")
  const [ownerFilter, setOwnerFilter] = useState("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newFolderName, setNewFolderName] = useState("")
  const [createFolderGroupId, setCreateFolderGroupId] = useState<string | null>(null)
  const [renameFolderName, setRenameFolderName] = useState("")
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null)

  const activeFolder = useMemo(
    () => folders.find((item) => item.id === activeFolderId) ?? folders[0],
    [activeFolderId, folders]
  )

  const activeGroup = groups.find((item) => item.id === activeGroupId) ?? groups[0]
  const ownerOptions = Array.from(
    new Set(folders.flatMap((folder) => folder.cases.map((item) => item.owner)))
  )

  const visibleCases = useMemo(() => {
    return activeFolder.cases.filter((item) => {
      const matchKeyword = keyword.trim() === "" || item.name.includes(keyword.trim())
      const matchOwner = ownerFilter === "all" || item.owner === ownerFilter
      return matchKeyword && matchOwner
    })
  }, [activeFolder.cases, keyword, ownerFilter])

  const handleReset = () => {
    setKeyword("")
    setOwnerFilter("all")
  }

  const handleCreateGroup = () => {
    const trimmedName = newGroupName.trim()
    if (!trimmedName) return

    const newGroup: CaseGroup = {
      id: `group-${Date.now()}`,
      name: trimmedName,
    }

    setGroups((prev) => [...prev, newGroup])
    setActiveGroupId(newGroup.id)
    setNewGroupName("")
    setIsCreateOpen(false)
  }

  const handleCreateFolder = () => {
    const trimmedName = newFolderName.trim()
    if (!trimmedName || !createFolderGroupId) return

    const newFolder: CaseFolder = {
      id: `folder-${Date.now()}`,
      name: trimmedName,
      groupId: createFolderGroupId,
      cases: [],
    }

    setFolders((prev) => [...prev, newFolder])
    setActiveGroupId(createFolderGroupId)
    setActiveFolderId(newFolder.id)
    setNewFolderName("")
    setCreateFolderGroupId(null)
    setIsCreateFolderOpen(false)
  }

  const handleRenameFolder = () => {
    if (!targetFolderId) return
    const trimmedName = renameFolderName.trim()
    if (!trimmedName) return

    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === targetFolderId ? { ...folder, name: trimmedName } : folder
      )
    )
    setTargetFolderId(null)
    setIsRenameOpen(false)
  }

  const handleDeleteFolder = () => {
    if (!targetFolderId || folders.length <= 1) return

    const deletingFolder = folders.find((folder) => folder.id === targetFolderId)
    if (!deletingFolder) return

    const nextFolders = folders.filter((folder) => folder.id !== targetFolderId)
    setFolders(nextFolders)

    const sameGroupFallback = nextFolders.find(
      (folder) => folder.groupId === deletingFolder.groupId
    )
    const globalFallback = nextFolders[0]
    const nextActive = sameGroupFallback ?? globalFallback

    if (nextActive) {
      setActiveGroupId(nextActive.groupId)
      setActiveFolderId(nextActive.id)
    }

    setTargetFolderId(null)
    setIsDeleteOpen(false)
  }

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

              <Accordion
                type="single"
                collapsible
                value={activeGroupId}
                onValueChange={(value) => {
                  if (!value) return
                  setActiveGroupId(value)
                }}
                className="gap-1"
              >
                {groups.map((group) => {
                  const groupFolders = folders.filter((folder) => folder.groupId === group.id)
                  return (
                    <AccordionItem key={group.id} value={group.id} className="border-none">
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
                          {groupFolders.map((folder) => (
                            <button
                              key={folder.id}
                              type="button"
                              onClick={() => {
                                setActiveGroupId(group.id)
                                setActiveFolderId(folder.id)
                              }}
                              className={`group/folder relative flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm ${
                                activeFolderId === folder.id
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <Folder className="size-3.5" />
                                {folder.name}
                              </span>

                              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs transition-transform duration-200 group-hover/folder:-translate-x-13">
                                {folder.cases.length}
                              </span>

                              <span className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/folder:opacity-100">
                                <Button
                                  type="button"
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label="重命名目录"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setTargetFolderId(folder.id)
                                    setRenameFolderName(folder.name)
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
                                  disabled={folders.length <= 1}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setTargetFolderId(folder.id)
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
            </aside>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="76%">
            <Card className="h-full rounded-none border-none shadow-none">
              <CardHeader >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>项目</span>
                  <span>/</span>
                  <span>{activeGroup.name}</span>
                  <span>/</span>
                  <span className="text-foreground">{activeFolder.name}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-1">
                <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_auto_auto]">
                  <Input
                    placeholder="输入用例名称"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
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
                  <Button className="gap-2">
                    <Search className="size-4" />
                    查询
                  </Button>
                  <Button variant="ghost" className="gap-2" onClick={handleReset}>
                    <RotateCcw className="size-4" />
                    重置
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>用例名称</TableHead>
                      <TableHead>请求类型</TableHead>
                      <TableHead>优先级</TableHead>
                      <TableHead>用例状态</TableHead>
                      <TableHead>创建人</TableHead>
                      <TableHead>更新时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          当前筛选条件下暂无用例
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleCases.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.id}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.method}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.status === "正常运行" ? "default" : "outline"}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.owner}</TableCell>
                          <TableCell>{item.updatedAt}</TableCell>
                          <TableCell className="text-right text-sm text-primary">
                            编辑 · 执行
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

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
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateGroup}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRenameFolder}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              在分组「{groups.find((item) => item.id === createFolderGroupId)?.name ?? "--"}」下创建目录。
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="请输入子目录名称"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateFolder}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除目录</DialogTitle>
            <DialogDescription>
              确认删除目录「{folders.find((item) => item.id === targetFolderId)?.name ?? "--"}」？该操作不可撤销。
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
    </section>
  )
}
