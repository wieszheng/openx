import { useState, useCallback } from 'react'
import {
  Settings,
  Monitor,
  Smartphone,
  Info,
  Download,
  Moon,
  Sun,
  Globe,
  Shield,
  FolderOpen,
  Terminal,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Heart,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
    <div className={cn('flex items-start justify-between gap-4 py-3', className)}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && (
          <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-sm">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsPage(): React.JSX.Element {
  // 基础设置状态
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [language, setLanguage] = useState('zh-CN')
  const [autoStart, setAutoStart] = useState(false)
  const [minimizeToTray, setMinimizeToTray] = useState(true)
  const [checkUpdatesOnStart, setCheckUpdatesOnStart] = useState(true)

  // 设备工具链状态
  const [adbPath, setAdbPath] = useState('')
  const [adbCustomPath, setAdbCustomPath] = useState(false)
  const [deviceTimeout, setDeviceTimeout] = useState('30')
  const [autoConnect, setAutoConnect] = useState(true)

  // 关于/更新状态
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'done'>('idle')
  const [updateProgress, setUpdateProgress] = useState(0)
  const latestVersion = '1.0.0'

  const currentVersion = '1.0.0'

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

  const handleBrowseAdb = useCallback(() => {
    // TODO: 调用原生文件选择对话框
    toast.info('请选择 ADB 可执行文件')
  }, [])

  const handleTestAdb = useCallback(async () => {
    if (!adbPath && !adbCustomPath) {
      toast.error('请先配置 ADB 路径')
      return
    }
    toast.success('ADB 连接正常')
  }, [adbPath, adbCustomPath])

  return (
    <div className="flex flex-col h-full">
      {/* 垂直 Tabs 布局 */}
      <Tabs defaultValue="general" orientation="vertical" className="flex-1 min-h-0">
     
          {/* 侧边导航 */}
          <TabsList variant="line" className="shrink-0 flex-col h-fit gap-1 bg-transparent p-0">
            <TabsTrigger
              value="general"
              className="w-full justify-start gap-3 py-2.5 rounded-lg data-active:bg-primary/10"
            >
              <Monitor className="w-4 h-4" />
              <span>基础设置</span>
            </TabsTrigger>
            <TabsTrigger
              value="devices"
              className="w-full justify-start gap-3 py-2.5 rounded-lg data-active:bg-primary/10"
            >
              <Smartphone className="w-4 h-4" />
              <span>设备工具链</span>
            </TabsTrigger>
            <TabsTrigger
              value="updates"
              className="w-full justify-start gap-3 py-2.5 rounded-lg data-active:bg-primary/10"
            >
              <Download className="w-4 h-4" />
              <span>检查更新</span>
            </TabsTrigger>
            <TabsTrigger
              value="about"
              className="w-full justify-start gap-3 py-2.5 rounded-lg data-active:bg-primary/10"
            >
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
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    外观
                  </CardTitle>
                  <CardDescription>自定义应用外观和显示效果</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  <SettingItem
                    icon={<Sun className="w-4 h-4" />}
                    title="主题模式"
                    description="选择应用界面的颜色主题"
                  >
                    <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">浅色</SelectItem>
                        <SelectItem value="dark">深色</SelectItem>
                        <SelectItem value="system">跟随系统</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingItem>

                  <Separator />

                  <SettingItem
                    icon={<Globe className="w-4 h-4" />}
                    title="语言"
                    description="选择界面显示语言"
                  >
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh-CN">简体中文</SelectItem>
                        <SelectItem value="zh-TW">繁体中文</SelectItem>
                        <SelectItem value="en-US">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingItem>
                </CardContent>
              </Card>

              {/* 通用 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    通用
                  </CardTitle>
                  <CardDescription>应用启动和后台运行设置</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  <SettingItem
                    icon={<Shield className="w-4 h-4" />}
                    title="开机自启"
                    description="系统启动时自动运行应用"
                  >
                    <Switch checked={autoStart} onCheckedChange={setAutoStart} />
                  </SettingItem>

                  <Separator />

                  <SettingItem
                    icon={<Shield className="w-4 h-4" />}
                    title="最小化到托盘"
                    description="关闭窗口时最小化到系统托盘"
                  >
                    <Switch checked={minimizeToTray} onCheckedChange={setMinimizeToTray} />
                  </SettingItem>

                  <Separator />

                  <SettingItem
                    icon={<RefreshCw className="w-4 h-4" />}
                    title="启动时检查更新"
                    description="应用启动时自动检查是否有新版本"
                  >
                    <Switch checked={checkUpdatesOnStart} onCheckedChange={setCheckUpdatesOnStart} />
                  </SettingItem>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 设备工具链 */}
            <TabsContent value="devices" className="mt-0 space-y-6">
              {/* ADB 配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    ADB 配置
                  </CardTitle>
                  <CardDescription>配置 Android Debug Bridge 工具路径</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SettingItem
                    icon={<FolderOpen className="w-4 h-4" />}
                    title="使用内置 ADB"
                    description="使用应用内置的 ADB 工具"
                  >
                    <Switch
                      checked={!adbCustomPath}
                      onCheckedChange={(checked) => setAdbCustomPath(!checked)}
                    />
                  </SettingItem>

                  {adbCustomPath && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">自定义 ADB 路径</p>
                        <div className="flex gap-2">
                          <Input
                            value={adbPath}
                            onChange={(e) => setAdbPath(e.target.value)}
                            placeholder="请输入 ADB 可执行文件路径"
                            className="flex-1"
                          />
                          <Button variant="outline" onClick={handleBrowseAdb}>
                            浏览
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleTestAdb}>
                      测试连接
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 连接设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    连接设置
                  </CardTitle>
                  <CardDescription>设备发现和连接参数配置</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  <SettingItem
                    icon={<RefreshCw className="w-4 h-4" />}
                    title="自动连接已知设备"
                    description="上次连接的设备自动重连"
                  >
                    <Switch checked={autoConnect} onCheckedChange={setAutoConnect} />
                  </SettingItem>

                  <Separator />

                  <SettingItem
                    icon={<Terminal className="w-4 h-4" />}
                    title="设备超时时间"
                    description="等待设备响应的超时时间（秒）"
                  >
                    <Select value={deviceTimeout} onValueChange={setDeviceTimeout}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10s</SelectItem>
                        <SelectItem value="30">30s</SelectItem>
                        <SelectItem value="60">60s</SelectItem>
                        <SelectItem value="120">120s</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingItem>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 检查更新 */}
            <TabsContent value="updates" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    软件更新
                  </CardTitle>
                  <CardDescription>检查并安装最新版本的 OpenX</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 当前版本 */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Download className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">OpenX</p>
                        <p className="text-sm text-muted-foreground">
                          当前版本: <span className="font-mono">{currentVersion}</span>
                        </p>
                      </div>
                    </div>
                    {updateStatus === 'idle' && (
                      <Badge variant="secondary">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        已是最新
                      </Badge>
                    )}
                  </div>

                  {/* 更新状态 */}
                  {updateStatus === 'checking' && (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">正在检查更新...</p>
                    </div>
                  )}

                  {updateStatus === 'available' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <AlertCircle className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">发现新版本 {latestVersion}</p>
                          <p className="text-xs text-muted-foreground">包含性能优化和问题修复</p>
                        </div>
                      </div>
                      <Button onClick={handleDownloadUpdate} className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        下载并安装
                      </Button>
                    </div>
                  )}

                  {updateStatus === 'downloading' && (
                    <div className="space-y-4">
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
                      <p className="text-xs text-muted-foreground text-center">
                        下载完成后将自动安装
                      </p>
                    </div>
                  )}

                  {updateStatus === 'done' && (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                      <p className="font-medium">更新已下载</p>
                      <p className="text-sm text-muted-foreground">重启应用以完成安装</p>
                      <Button>立即重启</Button>
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
                      <svg width="48" height="48" viewBox="0 0 100 100" fill="none" stroke="oklch(0.508 0.118 165.612)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M 20 50 L 35 20 L 80 20" />
                        <path d="M 80 50 L 65 80 L 20 80" />
                        <path d="M 35 35 L 65 65 M 35 65 L 65 35" strokeWidth="6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">OpenX</p>
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
                  <p className="text-sm text-muted-foreground">
                    感谢以下开源项目为本软件提供支持：
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Electron', 'React', 'Vite', 'Tailwind CSS', 'shadcn/ui', 'Radix UI', 'Zustand', 'Lucide'].map((name) => (
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
