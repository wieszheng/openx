import { Usb } from 'lucide-react'
import { DeviceCard } from '@/components/device-card'
import { useDevicesStore } from '@/stores/devices'


export function DashboardPage(): React.JSX.Element {
  // 设备列表
  const devices = useDevicesStore((s) => s.devices)

  return (
    <div className="flex flex-col h-full overflow-y-auto gap-3">

      {/* 设备列表 */}
      <div className="mt-1">
        <div className="flex items-center gap-2 mb-3">
          <Usb className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">已连接设备</h2>
          <span className="text-xs text-muted-foreground">({devices.length})</span>
        </div>
        {devices.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            暂无设备连接，请通过 USB 或无线连接设备
          </div>
        )}
      </div>
    </div>
  )
}
