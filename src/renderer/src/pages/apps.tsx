import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  Smartphone,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Grid3X3,
  List,
  Loader2,
  MoreVertical
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { DeviceApp } from '../../../shared/device-app'
// import { appIconSrc } from '../lib/app-icon'
import { useDevicesStore } from '../stores/devices'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

export function AppsPage(): React.JSX.Element {
  const selectedId = useDevicesStore((s) => s.selectedId)

  const [apps, setApps] = useState<DeviceApp[]>([])
  const [loading, setLoading] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [uninstallTarget, setUninstallTarget] = useState<DeviceApp | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')

  const fetchApps = useCallback(async () => {
    if (!selectedId) {
      setApps([])
      return
    }

    setLoading(true)
    try {
      const result = await window.api.apps.list(selectedId, { includeSystem: false })
      if (result.ok) {
        setApps(result.apps)
      } else {
        setApps([])
        toast.error(result.error)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    void fetchApps()
  }, [fetchApps])

  const handleStart = async (app: DeviceApp) => {
    if (!selectedId) return
    const key = `start:${app.packageName}`
    setActionKey(key)
    try {
      const result = await window.api.apps.start(selectedId, {
        packageName: app.packageName,
        mainAbility: app.mainAbility
      })
      if (result.ok) {
        toast.success(`已启动 ${app.name}`)
      } else {
        toast.error(result.error)
      }
    } finally {
      setActionKey(null)
    }
  }

  const handleStop = async (app: DeviceApp) => {
    if (!selectedId) return
    const key = `stop:${app.packageName}`
    setActionKey(key)
    try {
      const result = await window.api.apps.stop(selectedId, app.packageName)
      if (result.ok) {
        toast.success(`已停止 ${app.name}`)
      } else {
        toast.error(result.error)
      }
    } finally {
      setActionKey(null)
    }
  }

  const handleUninstallConfirm = async () => {
    if (!selectedId || !uninstallTarget) return
    const app = uninstallTarget
    const key = `uninstall:${app.packageName}`
    setActionKey(key)
    try {
      const result = await window.api.apps.uninstall(selectedId, app.packageName)
      if (result.ok) {
        toast.success(`已卸载 ${app.name}`)
        setApps((prev) => prev.filter((item) => item.packageName !== app.packageName))
      } else {
        toast.error(result.error)
      }
    } finally {
      setActionKey(null)
      setUninstallTarget(null)
    }
  }

  const filteredApps = apps.filter((app) => {
    const q = search.toLowerCase()
    return app.name.toLowerCase().includes(q) || app.packageName.toLowerCase().includes(q)
  })

  const renderActions = (app: DeviceApp, compact = false) => {
    const busy = actionKey?.endsWith(`:${app.packageName}`) ?? false
    const btnClass = compact ? 'h-7 w-7' : 'h-8 w-8'
    const iconClass = compact ? 'w-3.5 h-3.5' : 'w-4 h-4'

    return (
      <div className={`flex items-center ${compact ? 'gap-1' : 'justify-end gap-1'}`}>
        <Button
          variant="ghost"
          size="icon"
          className={btnClass}
          title="启动"
          disabled={busy || loading}
          onClick={() => void handleStart(app)}
        >
          {actionKey === `start:${app.packageName}` ? (
            <Loader2 className={`${iconClass} animate-spin`} />
          ) : (
            <Play className={iconClass} />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={btnClass}
          title="停止"
          disabled={busy || loading}
          onClick={() => void handleStop(app)}
        >
          {actionKey === `stop:${app.packageName}` ? (
            <Loader2 className={`${iconClass} animate-spin`} />
          ) : (
            <Pause className={iconClass} />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={btnClass}
          title="卸载"
          disabled={busy || loading}
          onClick={() => setUninstallTarget(app)}
        >
          <Trash2 className={`${iconClass} text-destructive`} />
        </Button>
      </div>
    )
  }

  const renderMenuActions = (app: DeviceApp) => {
    const busy = actionKey?.endsWith(`:${app.packageName}`) ?? false
    return (
      <>
        <DropdownMenuItem disabled={busy || loading} onSelect={() => void handleStart(app)}>
          <Play className="mr-2 h-4 w-4" />
          启动
        </DropdownMenuItem>
        <DropdownMenuItem disabled={busy || loading} onSelect={() => void handleStop(app)}>
          <Pause className="mr-2 h-4 w-4" />
          停止
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={busy || loading}
          onSelect={() => setUninstallTarget(app)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          卸载
        </DropdownMenuItem>
      </>
    )
  }

  if (!selectedId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        请先在标题栏选择设备
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="搜索应用名称或包名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <span className="text-xs text-muted-foreground shrink-0">仅用户安装应用</span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none h-8 w-8"
              onClick={() => setViewMode('table')}
            >
              <List className={`w-4 h-4 ${viewMode === 'table' ? 'text-primary' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className={`w-4 h-4 ${viewMode === 'grid' ? 'text-primary' : ''}`} />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => void fetchApps()} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            刷新
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && apps.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {search ? '没有找到应用' : '暂无应用数据'}
          </div>
        ) : viewMode === 'table' ? (
          <ScrollArea className="flex-1 min-h-0 h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>应用</TableHead>
                  <TableHead>包名</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead className="w-[150px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.map((app) => {
                  return (
                    <TableRow key={app.packageName}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center overflow-hidden shrink-0">
                            {app.icon ? (
                              <img src={app.icon} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Smartphone className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{app.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {app.packageName}
                        </code>
                      </TableCell>
                      <TableCell>
                        {app.version || '-'}
                        {app.versionCode != null ? (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({app.versionCode})
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">{renderActions(app)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <ScrollArea className="flex-1 min-h-0 h-full">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 px-0.5 mr-1">
              {filteredApps.map((app) => {
                return (
                  <div
                    key={app.packageName}
                    className="bg-card rounded-lg p-2 hover:shadow-md transition-colors relative group shadow-sm"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-1.5 overflow-hidden shrink-0">
                        {app.icon ? (
                          <img src={app.icon} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="w-full">
                        <span className="text-xs font-medium truncate max-w-full block">
                          {app.name}
                        </span>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <code className="text-[10px] text-muted-foreground truncate max-w-full mt-0.5 block cursor-help">
                            {app.packageName}
                          </code>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs break-all">
                          <p className="font-mono text-xs">{app.packageName}</p>
                        </TooltipContent>
                      </Tooltip>
                      {app.version && (
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          v{app.version}
                        </span>
                      )}
                    </div>
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-28">
                          {renderMenuActions(app)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      <AlertDialog
        open={uninstallTarget != null}
        onOpenChange={(open) => !open && setUninstallTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认卸载</AlertDialogTitle>
            <AlertDialogDescription>
              确定要卸载「{uninstallTarget?.name}」（{uninstallTarget?.packageName}
              ）吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleUninstallConfirm()}
            >
              卸载
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
