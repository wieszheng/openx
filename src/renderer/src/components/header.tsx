import {
  Minus,
  Square,
  X,
  Maximize2,
  ChevronsUpDown,
  Smartphone,
  Tablet,
  Sun,
  Moon
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { useDevicesStore } from '../stores/devices'
import type { UnifiedDevice } from '../../../shared/unified-device'
import { AnimatedGradientText } from './ui/animated-gradient-text'
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'

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
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const headerPrimary = selectedDevice?.displayName ?? '未检测到设备'
  const headerSecondary = selectedDevice
    ? [versionSummary(selectedDevice), selectedDevice.connectionKey].filter(Boolean).join(' · ')
    : ''
  const headerTitle = selectedDevice?.label ?? headerPrimary

  return (
    <header className="drag-region min-h-10 flex items-center select-none py-1">
      <div className="no-drag relative flex items-center" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1 transition-colors max-w-[min(100vw-12rem,22rem)] text-left"
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
              <div className="px-3 py-2 text-sm text-muted-foreground">未连接设备</div>
            ) : (
              devices.map((device) => (
                <button
                  type="button"
                  key={device.id}
                  onClick={() => {
                    setSelectedId(device.id)
                    setIsDropdownOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${
                    selectedId === device.id ? 'text-primary font-medium' : ''
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
        <div className="mx-5">
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
            className={`relative flex items-center w-[64px] h-[35px] rounded-xl p-0.5 cursor-pointer transition-colors ${
              theme === 'dark' ? 'bg-background border border-border' : 'bg-accent/50 border'
            }`}
          >
            <div
              className={`
              absolute top-1/2 -translate-y-1/2
              w-[28px] h-[28px] rounded-lg
              flex items-center justify-center
              transition-all duration-300 ease-in-out
              ${
                theme === 'dark'
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

        <button
          type="button"
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center hover:bg-accent transition-colors"
          aria-label="最小化"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center hover:bg-accent transition-colors"
          aria-label={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? <Square className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="w-8.5 h-8 flex items-center justify-center hover:bg-destructive transition-colors group"
          aria-label="关闭"
        >
          <X className="w-4 h-4 group-hover:text-destructive-foreground" />
        </button>
      </div>
    </header>
  )
}
