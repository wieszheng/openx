import React, { useState, useCallback, useEffect } from 'react'
import {
  Monitor,
  Smartphone,
  Info,
  Download,
  Sun,
  FolderOpen,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Heart,
  Loader2,
  Server,
  Copy
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from 'next-themes'

import {
  DEFAULT_BASE_URL,
  getBaseUrl,
  resetBaseUrl,
  setBaseUrl,
  testBackendConnection
} from '@/lib/settings'
import { ToolkitItemStatus, ToolkitStatusResult } from 'src/shared/toolkit-status'

// 设置项接口
interface SettingItemProps {
  icon?: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

function SettingItem({ icon, title, description, children, className }: SettingItemProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 py-3', className)}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>}
        <div className="min-w-0">
          <p className="font-medium text-sm">{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SourceBadge({ source }: { source: ToolkitItemStatus['source'] }): React.JSX.Element {
  const map: Record<ToolkitItemStatus['source'], { label: string; className: string }> = {
    bundled: { label: '内置', className: 'bg-primary/10 text-primary' },
    env: { label: '环境变量', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    system: { label: '系统 PATH', className: 'bg-muted text-muted-foreground' }
  }
  const config = map[source]
  return (
    <span
      className={cn('inline-block text-[10px] px-1.5 py-0.5 rounded font-medium', config.className)}
    >
      {config.label}
    </span>
  )
}

export function SettingsPage(): React.JSX.Element {
  // 基础设置状态
  const { theme, setTheme } = useTheme()

  const [baseUrlInput, setBaseUrlInput] = useState(() => getBaseUrl())
  const [testing, setTesting] = useState(false)
  // const [setTestResult] = useState<{
  //   ok: boolean
  //   message: string
  //   latencyMs?: number
  // } | null>(null)

  const [logPath, setLogPath] = useState<string | null>(null)
  const [toolkit, setToolkit] = useState<ToolkitStatusResult | null>(null)
  const [toolkitLoading, setToolkitLoading] = useState(false)
  const [copiedLog, setCopiedLog] = useState(false)

  // 关于/更新状态
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'downloading' | 'done'
  >('idle')
  const [updateProgress, setUpdateProgress] = useState(0)
  const latestVersion = '1.0.0'

  const currentVersion = '1.0.0'

  const loadToolkit = useCallback(async () => {
    setToolkitLoading(true)
    try {
      const status = await window.api.toolkit.status()
      setToolkit(status)
    } catch (e) {
      toast.error(String(e))
    } finally {
      setToolkitLoading(false)
    }
  }, [])

  useEffect(() => {
    void window.api.log.getPath().then(setLogPath)
    void loadToolkit()
  }, [loadToolkit])

  const handleSaveBaseUrl = () => {
    const trimmed = baseUrlInput.trim()
    if (!trimmed) {
      toast.error('请输入后端地址')
      return
    }
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `http://${trimmed}`)
      setBaseUrl(url.origin)
      setBaseUrlInput(url.origin)

      toast.success('后端地址已保存')
    } catch {
      toast.error('地址格式无效')
    }
  }

  const handleResetBaseUrl = () => {
    resetBaseUrl()
    setBaseUrlInput(DEFAULT_BASE_URL)

    toast.success('已恢复默认地址')
  }

  const handleTestConnection = async () => {
    const trimmed = baseUrlInput.trim()
    if (!trimmed) {
      toast.error('请输入后端地址')
      return
    }
    setTesting(true)

    try {
      let url = trimmed
      if (!url.startsWith('http')) url = `http://${url}`
      const result = await testBackendConnection(url)

      if (result.ok) {
        toast.success(`连接成功（${result.latencyMs}ms）`)
      } else {
        toast.error(result.message)
      }
    } finally {
      setTesting(false)
    }
  }
  // 检查更新
  const handleCheckUpdate = useCallback(async () => {
    setUpdateStatus('checking')
    setUpdateProgress(0)

    // 模拟检查更新
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // 模拟下载进度
    setUpdateStatus('available')
    toast.info(`发现新版本 ${latestVersion}`)
  }, [latestVersion])

  const handleDownloadUpdate = useCallback(async () => {
    setUpdateStatus('downloading')

    // 模拟下载进度
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      setUpdateProgress(i)
    }

    setUpdateStatus('done')
    toast.success('更新已下载，将在重启后安装')
  }, [])

  const handleCopyLogPath = () => {
    if (!logPath) return
    void navigator.clipboard.writeText(logPath)
    setCopiedLog(true)
    setTimeout(() => setCopiedLog(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 垂直 Tabs 布局 */}
      <Tabs defaultValue="general" orientation="vertical" className="flex-1 min-h-0">
        {/* 侧边导航 */}
        <TabsList variant="line" className="shrink-0 flex-col h-fit gap-1 bg-transparent p-0">
          <TabsTrigger value="general" className="w-full gap-3 py-2">
            <Monitor className="w-4 h-4" />
            <span>基础设置</span>
          </TabsTrigger>
          <TabsTrigger value="devices" className="w-full gap-3 py-2">
            <Smartphone className="w-4 h-4" />
            <span>设备工具链</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="w-full gap-3 py-2">
            <Info className="w-4 h-4" />
            <span>关于软件</span>
          </TabsTrigger>
        </TabsList>

        {/* 内容区域 */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 ml-3">
          {/* 基础设置 */}
          <TabsContent value="general" className="mt-0 space-y-6">
            {/* 外观 */}
            <Card>
              <CardHeader>
                <CardTitle>基础设置</CardTitle>
                <CardDescription>自定义应用外观和显示效果</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex flex-col gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground shrink-0">
                      <Sun className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">主题模式</p>
                      <p className="text-xs text-muted-foreground">选择应用界面的颜色主题</p>
                    </div>
                  </div>
                  <RadioGroup
                    value={theme}
                    onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
                    className="flex gap-3 pl-7"
                  >
                    {[
                      { value: 'light', label: '浅色' },
                      { value: 'dark', label: '深色' },
                      { value: 'system', label: '跟随系统' }
                    ].map((item) => (
                      <div key={item.value} className="flex items-center gap-1.5">
                        <RadioGroupItem value={item.value} id={`theme-${item.value}`} />
                        <Label htmlFor={`theme-${item.value}`} className="text-sm cursor-pointer">
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="flex flex-col gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground shrink-0">
                      <Server className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">后端服务</h3>
                      <p className="text-xs text-muted-foreground">自动化测试 API 地址</p>
                    </div>
                  </div>

                  <div className="space-y-4 pl-7">
                    <div className="flex gap-2">
                      <Input
                        id="base-url"
                        value={baseUrlInput}
                        onChange={(e) => setBaseUrlInput(e.target.value)}
                        placeholder={DEFAULT_BASE_URL}
                        className="font-mono text-sm flex-1"
                      />
                      <Button size="sm" onClick={handleSaveBaseUrl}>
                        保存
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleTestConnection()}
                            disabled={testing}
                          >
                            {testing ? (
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-1.5" />
                            )}
                            检测连通性
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>发送 GET /api/global-variables 请求</TooltipContent>
                      </Tooltip>
                      <Button size="sm" variant="ghost" onClick={handleResetBaseUrl}>
                        恢复默认
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground shrink-0">
                      <FolderOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">应用日志</h3>
                      <p className="text-xs text-muted-foreground">log 日志文件路径</p>
                    </div>
                  </div>
                  <div className="pl-7">
                    {logPath ? (
                      <div className="flex items-start gap-2">
                        <code className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 break-all font-mono">
                          {logPath}
                        </code>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="shrink-0 h-8 w-8"
                              onClick={handleCopyLogPath}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{copiedLog ? '已复制' : '复制路径'}</TooltipContent>
                        </Tooltip>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        加载中…
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 设备工具链 */}
          <TabsContent value="devices" className="mt-0 space-y-6">
            {/* ADB 配置 */}
            <Card>
              <CardHeader>
                <CardTitle>工具链</CardTitle>
                <CardDescription>adb / hdc / aapt 就绪状态</CardDescription>
              </CardHeader>
              <CardContent>
                <SettingItem
                  icon={<FolderOpen className="w-4 h-4 text-primary" />}
                  title="工具链根目录"
                  description="检测工具链"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        disabled={toolkitLoading}
                        onClick={() => void loadToolkit()}
                      >
                        {toolkitLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>刷新状态</TooltipContent>
                  </Tooltip>
                </SettingItem>

                <div className="pl-6 space-y-3">
                  {toolkitLoading && !toolkit ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      检测工具链中…
                    </div>
                  ) : toolkit ? (
                    <>
                      <div className="text-[11px] text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1.5">
                        根目录: {toolkit.toolkitRoot}
                      </div>
                      {toolkit.items.map((item) => (
                        <div
                          key={item.name}
                          className={cn(
                            'rounded-lg border p-3',
                            item.ready ? 'border-border' : 'border-amber-500/30 bg-amber-500/5'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{item.label}</span>
                              <Badge
                                variant={item.ready ? 'default' : 'secondary'}
                                className="text-[10px]"
                              >
                                {item.ready ? '就绪' : '不可用'}
                              </Badge>
                            </div>
                            <SourceBadge source={item.source} />
                          </div>
                          <div className="text-xs text-muted-foreground font-mono break-all">
                            {item.bundledPath ?? item.resolved}
                          </div>
                          {item.version && (
                            <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                              {item.version}
                            </div>
                          )}
                          {!item.ready && item.source === 'system' && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
                              未在 PATH 中找到，可设置 OPENX_{item.name.toUpperCase()}_PATH 环境变量
                            </p>
                          )}
                        </div>
                      ))}
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 关于软件 */}
          <TabsContent value="about" className="mt-0 space-y-6">
            {/* 软件信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  关于 OpenX
                </CardTitle>
                <CardDescription>开源设备管理工具</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 100 100"
                      fill="none"
                      stroke="oklch(0.508 0.118 165.612)"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M 6 50 H 22 L 32 20 L 68 80 L 78 50 H 94"
                        stroke-width="10.8"
                        stroke-linejoin="round"
                      ></path>
                      <path d="M 32 80 L 68 20" stroke-width="10.8"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      Open<span className="text-primary font-black">X</span>
                    </p>
                    <p className="text-sm text-muted-foreground">版本 {currentVersion}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      基于 Electron + React 的跨平台设备管理工具
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">构建日期</p>
                    <p className="font-mono mt-0.5">2026-05-19</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Electron</p>
                    <p className="font-mono mt-0.5">v39.2.6</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">React</p>
                    <p className="font-mono mt-0.5">v19.2.1</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Node.js</p>
                    <p className="font-mono mt-0.5">v22.x</p>
                  </div>
                </div>

                <Separator />

                {/* 更新状态 */}
                {updateStatus === 'checking' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    正在检查更新...
                  </div>
                )}

                {updateStatus === 'available' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-sm font-medium">发现新版本 {latestVersion}</p>
                    </div>
                    <Button onClick={handleDownloadUpdate} className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      下载并安装
                    </Button>
                  </div>
                )}

                {updateStatus === 'downloading' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>下载进度</span>
                      <span className="text-muted-foreground">{updateProgress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${updateProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {updateStatus === 'done' && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">更新已下载，重启后安装</span>
                    </div>
                    <Button size="sm">立即重启</Button>
                  </div>
                )}

                {updateStatus === 'idle' && (
                  <Button onClick={handleCheckUpdate} variant="outline" className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    检查更新
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* 致谢 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  致谢
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">感谢以下开源项目为本软件提供支持：</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    'Electron',
                    'React',
                    'Vite',
                    'Tailwind CSS',
                    'shadcn/ui',
                    'Radix UI',
                    'Zustand',
                    'Lucide'
                  ].map((name) => (
                    <Badge key={name} variant="outline">
                      {name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
