import {
  Minus,
  Square,
  X,
  Maximize2,
  ChevronsUpDown,
  Smartphone,
  Tablet,
  Sun,
  Moon,
  Loader2,
  PackagePlus,
  Circle,
  ArrowDownToLine,
  RefreshCw
} from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useDevicesStore } from '@/stores/devices'
import type { UnifiedDevice } from '../../../shared/unified-device'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/**
 * 获取设备版本摘要信息
 *
 * @param device - 统一设备对象
 * @returns 版本描述字符串，Android 显示"系统版本 · API级别"，鸿蒙显示"OpenHarmony版本 · API级别"
 */
function versionSummary(device: UnifiedDevice): string {
  if (device.platform === 'android') {
    const sys = device.androidVersion ? `Android ${device.androidVersion}` : ''
    const api = device.sdkVersion ? `API ${device.sdkVersion}` : ''
    return [sys, api].filter(Boolean).join(' · ')
  }
  const oh = device.ohosVersion ? `OpenHarmony ${device.ohosVersion}` : ''
  const api = device.sdkVersion ? `API ${device.sdkVersion}` : ''
  return [oh, api].filter(Boolean).join(' · ')
}

/**
 * 根据设备平台返回对应图标
 *
 * @param device - 统一设备对象
 * @returns 平台对应的图标组件
 */
function DeviceIcon({ device }: { device: UnifiedDevice }): React.JSX.Element {
  if (device.platform === 'harmony') {
    return <Tablet className="w-4 h-4 shrink-0 text-muted-foreground" />
  }
  return <Smartphone className="w-4 h-4 shrink-0 text-muted-foreground" />
}

/**
 * 应用标题栏组件
 *
 * 包含设备选择下拉框、主题切换和窗口控制按钮。
 * 标题栏内容根据当前选中设备动态显示。
 */
export function Header(): React.JSX.Element {
  const { theme, setTheme } = useTheme()
  const devices = useDevicesStore((s) => s.devices)
  const selectedId = useDevicesStore((s) => s.selectedId)
  const setSelectedId = useDevicesStore((s) => s.setSelectedId)
  const selectedDevice = devices.find((d) => d.id === selectedId)

  const [isMaximized, setIsMaximized] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'
  const [updateState, setUpdateState] = useState<UpdateState>('idle')
  const [updateVersion, setUpdateVersion] = useState<string>('')
  const [downloadPercent, setDownloadPercent] = useState(0)

  // 监听窗口最大化状态
  useEffect(() => {
    const checkMaximized = async () => {
      if (!window.api?.window?.isMaximized) return
      const maximized = await window.api.window.isMaximized()
      setIsMaximized(maximized)
    }
    void checkMaximized()

    const interval = setInterval(checkMaximized, 500)
    return () => clearInterval(interval)
  }, [])

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMinimize = () => {
    window.api?.window?.minimize?.()
  }

  const handleMaximize = () => {
    window.api?.window?.maximize?.()
    setIsMaximized(!isMaximized)
  }

  const handleClose = () => {
    window.api?.window?.close?.()
  }

  const handleInstallApp = async () => {
    if (!selectedId) {
      toast.error('请先选择设备')
      return
    }
    if (selectedDevice?.state !== 'online') {
      toast.error('设备未在线，无法安装')
      return
    }

    setInstalling(true)
    try {
      const result = await window.api.apps.install(selectedId)
      if (result.ok) {
        toast.success('应用安装成功')
      } else if (!result.cancelled && result.error) {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error(String(err))
    } finally {
      setInstalling(false)
    }
  }

  useEffect(() => {
    const offs = [
      window.api.updater.onChecking(() => setUpdateState('checking')),
      window.api.updater.onAvailable((info) => {
        setUpdateState('available')
        setUpdateVersion(info.version)
      }),
      window.api.updater.onNotAvailable(() => setUpdateState('idle')),
      window.api.updater.onProgress((info) => {
        setUpdateState('downloading')
        setDownloadPercent(info.percent)
      }),
      window.api.updater.onDownloaded(() => setUpdateState('downloaded')),
      window.api.updater.onError(() => setUpdateState('error')),
    ]
    return () => offs.forEach((off) => off())
  }, [])

  const handleUpdateClick = () => {
    if (updateState === 'idle' || updateState === 'error') {
      window.api.updater.check()
    } else if (updateState === 'available') {
      window.api.updater.download()
    } else if (updateState === 'downloaded') {
      window.api.updater.install()
    }
  }

  // 格式化录制时间
  const formatRecordingTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  const handleStartRecording = async () => {
    if (!selectedId) {
      toast.error('请先选择设备')
      return
    }
    if (selectedDevice?.state !== 'online') {
      toast.error('设备未在线，无法录制')
      return
    }

    try {
      const result = await window.api.record.start(selectedId)
      if (result.ok) {
        setIsRecording(true)
        setRecordingTime(0)
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleStopRecording = async () => {
    try {
      if (!selectedId) return
      if (isRecording) {
        const result = await window.api.record.stop(selectedId)
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current)
          recordingIntervalRef.current = null
        }
        setIsRecording(false)
        setRecordingTime(0)
        if (result.ok) {
          toast.success(`录制完成（${result.durationSec}s）已保存至 ${result.filePath}`)
        } else {
          toast.error(result.error)
        }
      }
    } catch (err) {
      toast.error(String(err))
    }
  }

  // 录制计时器
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [isRecording])



  const headerPrimary = selectedDevice?.displayName ?? 'None Devices'
  const headerSecondary = selectedDevice
    ? [versionSummary(selectedDevice), selectedDevice.connectionKey].filter(Boolean).join(' · ')
    : '未知数据描述'
  const headerTitle = selectedDevice?.label ?? headerPrimary
  const installTooltip =
    selectedDevice?.platform === 'harmony' ? '安装 HAP 应用包到设备' : '安装 APK 到设备'

  return (
    <header className="drag-region min-h-10 flex items-center select-none py-1">
      <div className="no-drag relative flex items-center" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 mt-2 transition-colors max-w-[min(100vw-12rem,22rem)] text-left"
        >
          <ChevronsUpDown className="w-4.5 h-4.5 text-muted-foreground shrink-0 self-center" />
          <span className="min-w-0 flex flex-col gap-0.5" title={headerTitle}>
            <AnimatedGradientText className="text-sm font-bold leading-tight truncate">
              {headerPrimary}
            </AnimatedGradientText>
            {headerSecondary ? (
              <AnimatedShinyText className="text-[11px] text-muted-foreground leading-tight truncate">
                {headerSecondary}
              </AnimatedShinyText>
            ) : null}
          </span>
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 min-w-56 max-w-[min(100vw-8rem,24rem)] bg-background border border-border rounded-lg shadow-lg py-1 z-50">
            {devices.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">None Devices</div>
            ) : (
              devices.map((device) => (
                <button
                  type="button"
                  key={device.id}
                  onClick={() => {
                    setSelectedId(device.id)
                    setIsDropdownOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${selectedId === device.id ? 'text-primary font-medium' : ''
                    }`}
                >
                  <DeviceIcon device={device} />
                  <span
                    className="min-w-0 flex-1 flex flex-col items-start gap-0.5"
                    title={device.label}
                  >
                    <span className="font-medium leading-snug truncate w-full">
                      {device.displayName}
                    </span>
                  </span>
                  {device.state !== 'online' && (
                    <span className="text-xs text-muted-foreground shrink-0">{device.state}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="no-drag flex items-center ml-auto gap-1 self-center pr-1">
        {/* Update indicator */}
        {updateState !== 'idle' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleUpdateClick}
                disabled={updateState === 'checking' || updateState === 'downloading'}
                className={`relative w-8 h-8 flex items-center justify-center hover:bg-accent transition-colors rounded-lg ${updateState === 'available' || updateState === 'downloaded' ? 'text-primary' : ''
                  } ${updateState === 'error' ? 'text-destructive' : ''}`}
              >
                {updateState === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
                {updateState === 'available' && <ArrowDownToLine className="w-4 h-4" />}
                {updateState === 'downloading' && (
                  <span className="text-[10px] font-mono font-bold">{downloadPercent}%</span>
                )}
                {updateState === 'downloaded' && <RefreshCw className="w-4 h-4" />}
                {updateState === 'error' && <RefreshCw className="w-4 h-4" />}
                {(updateState === 'available' || updateState === 'downloaded') && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {updateState === 'checking' && '检查更新中…'}
              {updateState === 'available' && `发现新版本 v${updateVersion}，点击下载`}
              {updateState === 'downloading' && `正在下载 ${downloadPercent}%`}
              {updateState === 'downloaded' && '下载完成，点击重启安装'}
              {updateState === 'error' && '更新出错，点击重试'}
            </TooltipContent>
          </Tooltip>
        )}
        <div className="mx-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setTheme(theme === 'dark' ? 'light' : 'dark')
              }
            }}
            className={`relative flex items-center w-[64px] h-[35px] rounded-xl p-0.5 cursor-pointer transition-colors ${theme === 'dark' ? 'bg-background border border-border' : 'bg-accent/50 border'
              }`}
          >
            <div
              className={`
              absolute top-1/2 -translate-y-1/2
              w-[28px] h-[28px] rounded-lg
              flex items-center justify-center
              transition-all duration-300 ease-in-out
              ${theme === 'dark'
                  ? 'right-0.5 bg-zinc-700'
                  : 'left-0.5 bg-white shadow-sm border border-border'
                }
            `}
            >
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Sun className="w-4.5 h-4.5 text-primary" />
              )}
            </div>
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void handleInstallApp()}
              disabled={!selectedId || installing || selectedDevice?.state !== 'online'}
              className="w-8 h-8 flex items-center justify-center hover:bg-accent transition-colors rounded-lg mx-1"
            >
              {installing ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <PackagePlus className="w-4.5 h-4.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {installTooltip}
          </TooltipContent>
        </Tooltip>

        {/* 灵动岛风格录制按钮 */}
        {isRecording ? (
          // 录制中 - 灵动岛风格
          <div
            className={cn(
              'relative flex items-center gap-2 mx-1 px-3 h-8 rounded-full cursor-pointer',
              'bg-black/90 hover:bg-black/80 transition-all duration-300',
              'animate-[glow-pulse_2s_ease-in-out_infinite]'
            )}
            onClick={handleStopRecording}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleStopRecording()
              }
            }}
          >
            {/* 闪烁的录制指示灯 */}
            <div className="relative flex items-center justify-center">
              <Circle
                className={cn(
                  'w-2.5 h-2.5 fill-red-500 text-red-500',
                  'animate-[recording-blink_1s_ease-in-out_infinite]'
                )}
              />
            </div>
            {/* 录制时间 */}
            <span className="text-white text-xs font-medium tabular-nums">
              {formatRecordingTime(recordingTime)}
            </span>
            {/* 停止图标 */}
            <div className="w-2 h-2 bg-white rounded-sm" />
          </div>
        ) : (
          // 非录制状态 - 录制按钮
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={!selectedId || selectedDevice?.state !== 'online'}
                className="w-8 h-8 flex items-center justify-center hover:bg-accent transition-colors rounded-lg mx-1"
              >
                <Circle className="w-4 h-4 fill-red-500/20 text-red-500" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              开始屏幕录制
            </TooltipContent>
          </Tooltip>
        )}

        <button
          type="button"
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center hover:bg-accent transition-colors rounded-lg"
          aria-label="最小化"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center hover:bg-accent transition-colors rounded-lg"
          aria-label={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? <Square className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="w-8.5 h-8 flex items-center justify-center hover:bg-destructive transition-colors rounded-lg"
          aria-label="关闭"
        >
          <X className="w-4 h-4 group-hover:text-destructive-foreground" />
        </button>
      </div>
    </header>
  )
}
