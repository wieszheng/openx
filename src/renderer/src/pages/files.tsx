import { useState, useEffect, useCallback } from 'react'
import {
  Folder,
  File,
  ChevronRight,
  Home,
  ArrowUp,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Loader2,
  HardDrive,
  FolderPlus,
  Check,
  X,
  LayoutGrid,
  List,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDevicesStore } from '../stores/devices'
import type { FileEntry } from '../../../shared/files'

const ANDROID_ROOT = '/sdcard'
const HARMONY_ROOT = '/data/local/tmp'

function getDefaultPath(platform?: string): string {
  return platform === 'harmony' ? HARMONY_ROOT : ANDROID_ROOT
}

function formatSize(bytes: number): string {
  if (bytes < 0) return ''
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function Breadcrumb({
  path,
  onNavigate,
}: {
  path: string
  onNavigate: (p: string) => void
}): React.JSX.Element {
  const parts = path === '/' ? [''] : path.split('/')
  const segments = parts.reduce<{ label: string; path: string }[]>((acc, part, i) => {
    acc.push({
      label: i === 0 ? '/' : part,
      path: parts.slice(0, i + 1).join('/') || '/',
    })
    return acc
  }, [])

  return (
    <div className="flex items-center gap-1 text-sm min-w-0 overflow-x-auto no-scrollbar">
      {segments.map((seg, i) => (
        <span key={seg.path} className="flex items-center gap-1 shrink-0">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          <button
            type="button"
            onClick={() => onNavigate(seg.path)}
            className={`px-1 py-0.5 rounded hover:bg-accent transition-colors ${
              i === segments.length - 1
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {i === 0 ? <Home className="w-3.5 h-3.5" /> : seg.label}
          </button>
        </span>
      ))}
    </div>
  )
}

type ViewMode = 'list' | 'grid'

export function FilesPage(): React.JSX.Element {
  const selectedId = useDevicesStore((s) => s.selectedId)
  const devices = useDevicesStore((s) => s.devices)
  const selectedDevice = devices.find((d) => d.id === selectedId)

  const platform = selectedDevice?.platform
  const rootPath = getDefaultPath(platform)

  const [path, setPath] = useState(rootPath)
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const [mkdirOpen, setMkdirOpen] = useState(false)
  const [mkdirName, setMkdirName] = useState('')
  const [mkdirLoading, setMkdirLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const canUse = selectedDevice?.state === 'online' &&
    (selectedDevice.platform === 'android' || selectedDevice.platform === 'harmony')

  const loadDir = useCallback(async (targetPath: string) => {
    if (!selectedId || !canUse) return
    setLoading(true)
    try {
      const result = await window.api.files.list(selectedId, targetPath)
      if (result.ok) {
        setEntries(result.entries)
        setPath(targetPath)
      } else {
        toast.error(result.error)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedId, canUse])

  useEffect(() => {
    const root = getDefaultPath(selectedDevice?.platform)
    if (canUse) {
      void loadDir(root)
    } else {
      setEntries([])
      setPath(root)
    }
  }, [selectedId, canUse, loadDir])

  const navigate = (entry: FileEntry) => {
    if (entry.isDirectory) void loadDir(entry.path)
  }

  const goUp = () => {
    if (path === rootPath || path === '/') return
    const parent = path.substring(0, path.lastIndexOf('/')) || '/'
    if (platform === 'harmony' && !parent.startsWith(HARMONY_ROOT)) return
    void loadDir(parent)
  }

  const handleDownload = async (entry: FileEntry) => {
    if (!selectedId) return
    const result = await window.api.files.download(selectedId, entry.path)
    if (result.ok) {
      toast.success(`已保存至 ${result.localPath}`)
    } else if (result.error !== 'cancelled') {
      toast.error(result.error)
    }
  }

  const handleUpload = async () => {
    if (!selectedId) return
    const result = await window.api.files.upload(selectedId, path)
    if (result.ok) {
      toast.success('上传成功')
      void loadDir(path)
    } else if (result.error !== 'cancelled') {
      toast.error(result.error)
    }
  }

  const handleDelete = async (entry: FileEntry) => {
    if (!selectedId) return
    setDeletingPath(entry.path)
    try {
      const result = await window.api.files.delete(selectedId, entry.path)
      if (result.ok) {
        toast.success(`已删除 ${entry.name}`)
        setEntries((prev) => prev.filter((e) => e.path !== entry.path))
      } else {
        toast.error(result.error)
      }
    } finally {
      setDeletingPath(null)
    }
  }

  const handleMkdir = async () => {
    if (!selectedId || !mkdirName.trim()) return
    const newPath = `${path.replace(/\/$/, '')}/${mkdirName.trim()}`
    setMkdirLoading(true)
    try {
      const result = await window.api.files.mkdir(selectedId, newPath)
      if (result.ok) {
        toast.success(`已创建 ${mkdirName}`)
        setMkdirName('')
        setMkdirOpen(false)
        void loadDir(path)
      } else {
        toast.error(result.error)
      }
    } finally {
      setMkdirLoading(false)
    }
  }

  const cancelMkdir = () => {
    setMkdirOpen(false)
    setMkdirName('')
  }

  if (!selectedId || !selectedDevice) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <HardDrive className="w-10 h-10 opacity-30" />
        <p className="text-sm">请先选择设备</p>
      </div>
    )
  }

  if (!canUse) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <HardDrive className="w-10 h-10 opacity-30" />
        <p className="text-sm">
          {selectedDevice.state !== 'online' ? '设备未在线' : '暂不支持 iOS 文件管理'}
        </p>
      </div>
    )
  }

  const isEmpty = !loading && entries.length === 0
  const isInitialLoading = loading && entries.length === 0

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goUp} disabled={path === rootPath || loading}>
              <ArrowUp className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>返回上级</TooltipContent>
        </Tooltip>

        <div className="flex-1 px-3 py-1.5 min-w-0">
          <Breadcrumb path={path} onNavigate={(p) => void loadDir(p)} />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => void loadDir(path)} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>刷新</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMkdirOpen((v) => !v)}
              disabled={loading}
            >
              <FolderPlus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>新建文件夹</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => void handleUpload()} disabled={loading}>
              <Upload className="w-3.5 h-3.5" />
              上传
            </Button>
          </TooltipTrigger>
          <TooltipContent>上传文件到当前目录</TooltipContent>
        </Tooltip>

        {/* View toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-none ${viewMode === 'list' ? 'bg-accent' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>列表视图</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-none ${viewMode === 'grid' ? 'bg-accent' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>卡片视图</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Mkdir inline input */}
      {mkdirOpen && (
        <div className="flex items-center gap-2 shrink-0">
          <Input
            autoFocus
            className="flex-1 h-8 text-sm"
            value={mkdirName}
            onChange={(e) => setMkdirName(e.target.value)}
            placeholder="输入文件夹名称"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleMkdir()
              if (e.key === 'Escape') cancelMkdir()
            }}
          />
          <Button size="icon" className="h-8 w-8" onClick={() => void handleMkdir()} disabled={!mkdirName.trim() || mkdirLoading}>
            {mkdirLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={cancelMkdir}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* File area */}
      <div className="flex-1 overflow-hidden">
        {isInitialLoading ? (
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">加载中…</span>
          </div>
        ) : isEmpty ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            目录为空
          </div>
        ) : viewMode === 'list' ? (
          /* ── List view ── */
          <ScrollArea className="h-full">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b z-10">
                <tr className="text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2.5 w-full">名称</th>
                  <th className="text-right font-medium px-4 py-2.5 whitespace-nowrap">大小</th>
                  <th className="text-right font-medium px-4 py-2.5 whitespace-nowrap">修改时间</th>
                  <th className="text-left font-medium px-4 py-2.5 whitespace-nowrap">权限</th>
                  <th className="px-3 py-2.5 w-20" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.path}
                    className={`group border-t border-border/40 hover:bg-accent/50 transition-colors ${
                      entry.isDirectory ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => navigate(entry)}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {entry.isDirectory ? (
                          <Folder className="w-4 h-4 text-primary/70 shrink-0" />
                        ) : (
                          <File className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">{entry.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatSize(entry.size)}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {entry.mtime}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {entry.permissions}
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!entry.isDirectory && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleDownload(entry)}>
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>下载</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingPath === entry.path}
                              onClick={() => void handleDelete(entry)}
                            >
                              {deletingPath === entry.path
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />
                              }
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>删除</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        ) : (
          /* ── Grid view ── */
          <ScrollArea className="h-full">
            <div className="p-3 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
              {entries.map((entry) => (
                <div
                  key={entry.path}
                  className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-lg border border-transparent hover:border-border hover:bg-accent/50 transition-colors ${
                    entry.isDirectory ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => navigate(entry)}
                >
                  {entry.isDirectory ? (
                    <Folder className="w-10 h-10 text-primary/70" />
                  ) : (
                    <File className="w-10 h-10 text-muted-foreground" />
                  )}
                  <span className="text-xs text-center leading-tight line-clamp-2 w-full break-all">
                    {entry.name}
                  </span>
                  {entry.size >= 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {formatSize(entry.size)}
                    </span>
                  )}

                  {/* Hover actions */}
                  <div
                    className="absolute top-1 right-1 hidden group-hover:flex gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!entry.isDirectory && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => void handleDownload(entry)}>
                            <Download className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>下载</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:text-destructive hover:bg-destructive/10"
                          disabled={deletingPath === entry.path}
                          onClick={() => void handleDelete(entry)}
                        >
                          {deletingPath === entry.path
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />
                          }
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>删除</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground shrink-0">
        {entries.length} 项
      </div>
    </div>
  )
}
