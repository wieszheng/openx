import { useEffect, useState } from 'react'
import { Usb, Activity, Code2, Terminal, CheckCircle2, XCircle, PackageOpen, Layers } from 'lucide-react'
import { DeviceCard } from '@/components/device-card'
import { useDevicesStore } from '@/stores/devices'
import type { ToolkitStatusResult } from '../../../shared/toolkit-status'
import { cn } from '@/lib/utils'

export function DashboardPage(): React.JSX.Element {
  // 设备列表
  const devices = useDevicesStore((s) => s.devices)
  const refreshDevices = useDevicesStore((s) => s.refresh)

  // 工具包状态
  const [toolkitStatus, setToolkitStatus] = useState<ToolkitStatusResult | null>(null)

  useEffect(() => {
    refreshDevices()
    window.api?.toolkit.status().then(setToolkitStatus)
  }, [refreshDevices])

  const harmonyCount = devices.filter(d => d.platform === 'harmony').length
  const androidCount = devices.filter(d => d.platform === 'android').length
  const onlineCount = devices.filter(d => d.state === 'online').length

  return (
    <div className="flex flex-col h-full overflow-y-auto gap-4">


      {/* 核心数据看板 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-sm font-medium text-muted-foreground">总连接设备</span>
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Usb className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <span className="text-3xl font-bold">{devices.length}</span>
            <span className="text-xs text-muted-foreground ml-2">台</span>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Usb className="w-24 h-24" />
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-sm font-medium text-muted-foreground">在线设备</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <span className="text-3xl font-bold">{onlineCount}</span>
            <span className="text-xs text-muted-foreground ml-2">台在线</span>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity text-emerald-500">
            <Activity className="w-24 h-24" />
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-sm font-medium text-muted-foreground">HarmonyOS</span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <span className="text-3xl font-bold">{harmonyCount}</span>
            <span className="text-xs text-muted-foreground ml-2">台</span>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity text-blue-500">
            <Layers className="w-24 h-24" />
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-sm font-medium text-muted-foreground">Android</span>
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
              <Code2 className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <span className="text-3xl font-bold">{androidCount}</span>
            <span className="text-xs text-muted-foreground ml-2">台</span>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity text-green-500">
            <Code2 className="w-24 h-24" />
          </div>
        </div>
      </div>

      {/* 环境变量与依赖状态 */}
      <div className="flex items-center gap-3 py-2">
        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
          <Terminal className="w-3.5 h-3.5" />
          运行环境
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolkitStatus ? (
            toolkitStatus.items.map((item) => (
              <div 
                key={item.name} 
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
                  item.ready 
                    ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10" 
                    : "bg-red-500/5 text-red-600 border-red-500/20 dark:text-red-400 dark:bg-red-500/10"
                )}
                title={item.resolved}
              >
                {item.ready ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-wider">{item.name}</span>
                {item.version && (
                  <>
                    <span className="w-[1px] h-2.5 bg-current opacity-30 mx-0.5"></span>
                    <span className="opacity-80 font-normal">{item.version}</span>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground animate-pulse">检查中...</div>
          )}
        </div>
      </div>

      {/* 设备列表 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <PackageOpen className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold">已连接设备</h2>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{devices.length}</span>
        </div>
        {devices.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-card border border-border/50 border-dashed rounded-xl">
            <Usb className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm font-medium">暂无设备连接</p>
            <p className="text-xs text-muted-foreground/70 mt-1">请通过 USB 或网络连接您的 Android / HarmonyOS 设备</p>
          </div>
        )}
      </div>
    </div>
  )
}
