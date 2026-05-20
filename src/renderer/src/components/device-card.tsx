import { Smartphone, Tablet, Monitor, Wifi, WifiOff, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UnifiedDevice, UnifiedDevicePlatform, UnifiedDeviceState } from '../../../shared/unified-device'

/** 设备卡片属性 */
interface DeviceCardProps {
  /** 设备数据 */
  device: UnifiedDevice
}

/** 根据 platform 获取设备图标 */
function getDeviceIcon(platform: UnifiedDevicePlatform): React.ReactNode {
  switch (platform) {
    case 'android':
      return <Smartphone className="w-6 h-6" />
    case 'harmony':
      return <Tablet className="w-6 h-6" />
    default:
      return <Monitor className="w-6 h-6" />
  }
}

/** 根据状态获取状态徽标 */
function getStateBadge(state: UnifiedDeviceState): { label: string; color: string } {
  switch (state) {
    case 'online':
      return { label: '在线', color: 'bg-emerald-500' }
    case 'offline':
      return { label: '离线', color: 'bg-zinc-400' }
    case 'unauthorized':
      return { label: '未授权', color: 'bg-amber-500' }
    default:
      return { label: '未知', color: 'bg-zinc-400' }
  }
}

/** 根据状态获取状态图标 */
function getStateIcon(state: UnifiedDeviceState): React.ReactNode {
  switch (state) {
    case 'online':
      return <Wifi className="w-3.5 h-3.5" />
    case 'offline':
      return <WifiOff className="w-3.5 h-3.5" />
    case 'unauthorized':
      return <Ban className="w-3.5 h-3.5" />
    default:
      return <WifiOff className="w-3.5 h-3.5" />
  }
}

/** 获取 ribbon 角标文案 */
function getRibbonLabel(platform: UnifiedDevicePlatform): string {
  return platform === 'harmony' ? 'Harmony' : 'Android'
}

/**
 * 设备卡片组件。
 * 参考暗色渐变卡片设计，带角标 ribbon 和状态指示。
 */
export function DeviceCard({ device }: DeviceCardProps): React.JSX.Element {
  const stateBadge = getStateBadge(device.state)
  const isOnline = device.state === 'online'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl w-42 bg-card',
        'ring-1 ring-black/5 shadow-lg shadow-black/5',
      )}

    >
      {/* 角标 ribbon */}
      <span className="absolute overflow-hidden" style={{ width: '150px', height: '150px', top: '-35px', left: '-35px', zIndex: 10 }}>
        <span
          className={cn(
            'absolute flex items-center justify-center font-semibold tracking-wider text-white text-[10px] uppercase shadow-md',
            device.platform === 'android'
              ? 'bg-gradient-to-r from-green-500 via-emerald-400 to-green-500'
              : 'bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500',
          )}
          style={{
            width: '180px',
            height: '28px',
            top: '50%',
            left: '-25px',
            transform: 'rotate(-45deg) translateY(-14px)',
          }}
        >
          {getRibbonLabel(device.platform)}
        </span>
      </span>

      {/* 内容区 */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full pt-10 pb-6 px-4">
        {/* 设备图标 */}
        <div
          className={cn(
            'flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-colors',
            isOnline
              ? 'bg-primary/20 text-primary'
              : 'bg-zinc-200/60 text-zinc-400 dark:bg-zinc-700/50 dark:text-zinc-500',
          )}
        >
          {getDeviceIcon(device.platform)}
        </div>

        {/* 设备名称 */}
        <p className="text-zinc-900 dark:text-white text-sm font-semibold text-center leading-tight line-clamp-2 max-w-full">
          {device.displayName}
        </p>

        {/* 版本信息 */}
        <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5 text-center truncate max-w-full">
          {device.androidVersion && `Android ${device.androidVersion}`}
          {device.ohosVersion && `Harmony ${device.ohosVersion}`}
          {device.sdkVersion && ` · API ${device.sdkVersion}`}
        </p>

        {/* 状态徽标 */}
        <div
          className={cn(
            'flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full text-xs font-medium',
            isOnline
              ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'bg-zinc-200/60 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-400',
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', stateBadge.color)} />
          {getStateIcon(device.state)}
          <span>{stateBadge.label}</span>
        </div>
      </div>
    </div>
  )
}
