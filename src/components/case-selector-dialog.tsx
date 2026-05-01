import { useEffect, useState } from "react"
import { Folder, FolderOpen, Search, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { casesApi, directoriesApi, groupsApi } from "@/lib/api"
import type { Directory, Group, TestCase } from "@/lib/api"

const PRIORITY_STYLES: Record<string, string> = {
  P0: "bg-red-100 text-red-700 border-red-200",
  P1: "bg-orange-100 text-orange-700 border-orange-200",
  P2: "bg-blue-100 text-blue-700 border-blue-200",
  P3: "bg-gray-100 text-gray-700 border-gray-200",
}

interface CaseSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentCase?: TestCase | null
  onSelect: (testCase: TestCase) => void
}

export function CaseSelectorDialog({
  open,
  onOpenChange,
  currentCase,
  onSelect,
}: CaseSelectorDialogProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [directories, setDirectories] = useState<Directory[]>([])
  const [cases, setCases] = useState<TestCase[]>([])
  const [activeDirId, setActiveDirId] = useState<string | null>(null)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState("")
  const [loadingCases, setLoadingCases] = useState(false)
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null)

  // 加载目录树；若有当前绑定用例，跳转到其目录并预选
  useEffect(() => {
    if (!open) return
    Promise.all([groupsApi.list(), directoriesApi.list()]).then(([g, d]) => {
      setGroups(g)
      setDirectories(d)
      if (currentCase?.directory_id) {
        const dir = d.find((dir) => dir.id === currentCase.directory_id)
        setActiveDirId(currentCase.directory_id)
        setActiveGroupId(dir ? String(dir.group_id) : (g[0] ? String(g[0].id) : null))
        setSelectedCase(currentCase)
      } else {
        if (g.length > 0) setActiveGroupId(String(g[0].id))
        if (d.length > 0) setActiveDirId(d[0].id)
      }
    })
  }, [open])

  // 加载用例列表
  useEffect(() => {
    if (!activeDirId) { setCases([]); return }
    setLoadingCases(true)
    casesApi
      .list(activeDirId, { page: 1, page_size: 50 })
      .then((data) => setCases(data.items))
      .catch(() => setCases([]))
      .finally(() => setLoadingCases(false))
  }, [activeDirId])

  const filteredCases = keyword.trim()
    ? cases.filter((c) => c.name.toLowerCase().includes(keyword.toLowerCase()))
    : cases

  const handleConfirm = () => {
    if (!selectedCase) return
    onSelect(selectedCase)
    onOpenChange(false)
  }

  const handleClose = () => {
    setSelectedCase(null)
    setKeyword("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex h-[70vh] w-full min-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base">选择关联用例</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* 左侧目录树 */}
          <div className="w-52 overflow-y-auto">
            <Accordion
              type="single"
              collapsible
              value={activeGroupId ?? ""}
              onValueChange={(v) => setActiveGroupId(v || null)}
              className="p-2"
            >
              {groups.map((group) => {
                const groupDirs = directories.filter((d) => d.group_id === group.id)
                return (
                  <AccordionItem key={group.id} value={String(group.id)} className="border-none">
                    <AccordionTrigger className="rounded-md px-2 py-2 text-sm hover:no-underline hover:bg-accent/50">
                      <span className="flex items-center gap-2">
                        <FolderOpen className="size-3.5 text-muted-foreground" />
                        <span className="font-medium">{group.name}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-1">
                      <div className="space-y-0.5 pl-4">
                        {groupDirs.map((dir) => (
                          <button
                            key={dir.id}
                            type="button"
                            onClick={() => setActiveDirId(dir.id)}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                              activeDirId === dir.id
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <Folder className="size-3.5 shrink-0" />
                            <span className="truncate">{dir.name}</span>
                          </button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>

          {/* 右侧用例列表 */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* 搜索框 */}
            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="搜索用例名称…"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>

            {/* 用例列表 */}
            <ScrollArea className="flex-1 min-h-0">
              {loadingCases ? (
                <p className="py-10 text-center text-sm text-muted-foreground">加载中…</p>
              ) : filteredCases.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">暂无用例</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredCases.map((c) => {
                    const isSelected = selectedCase?.id === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCase(c)}
                        className={`group relative flex w-full items-stretch gap-0 text-left transition-colors ${
                          isSelected ? "bg-primary/8" : "hover:bg-accent/40"
                        }`}
                      >
                        {/* 左侧选中色条 */}
                        <span className={`w-0.5 shrink-0 rounded-r transition-colors ${
                          isSelected ? "bg-primary" : "bg-transparent"
                        }`} />

                        {/* 内容区 */}
                        <span className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden px-4 py-2.5">

                          {/* 左：标题 + 描述，min-w-0 确保 truncate 生效 */}
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className={`truncate text-[13px] font-medium leading-5 ${
                              isSelected ? "text-primary" : "text-foreground"
                            }`}>
                              {c.name}
                            </span>
                            {c.description && (
                              <span className="truncate text-[11px] text-muted-foreground">
                                {c.description}
                              </span>
                            )}
                          </span>

                          {/* 右：固定宽度，不参与压缩 */}
                          <span className="flex shrink-0 items-center gap-2">
                            <Zap className={`size-4 ${c.is_automated ? "text-amber-500" : "text-muted-foreground/20"}`} />
                            <Badge
                              variant="outline"
                              className={`hrink-0 font-mono text-[11px] ${PRIORITY_STYLES[c.priority]}`}
                            >
                              {c.priority}
                            </Badge>
                          </span>

                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="border-t px-5 py-3">
          <div className="flex w-full items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selectedCase ? (
                <>已选择：<span className="font-medium text-foreground">{selectedCase.name}</span></>
              ) : (
                "点击列表中的用例进行选择"
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>取消</Button>
              <Button size="sm" disabled={!selectedCase} onClick={handleConfirm}>
                确认绑定
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
