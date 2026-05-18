import { create } from 'zustand'
import { UnifiedDevice } from '../../../shared/unified-device'

/** 设备 Store 接口 */
interface DevicesStore {
  /** 设备列表 */
  devices: UnifiedDevice[]
  /** 当前选中设备 ID */
  selectedId: string | null
  /** 设置设备列表并智能选择 */
  setDevices: (devices: UnifiedDevice[]) => void
  /** 设置选中设备 ID */
  setSelectedId: (id: string) => void
  /** 刷新设备列表 */
  refresh: () => void
}

/** 设备 Store */
export const useDevicesStore = create<DevicesStore>((set, get) => ({
  devices: [],
  selectedId: null,

  setDevices: (devices) => {
    const { selectedId } = get()
    const keepId = selectedId && devices.some((d) => d.id === selectedId)
    let newSelectedId = keepId ? selectedId : null

    if (!newSelectedId) {
      const firstOnline = devices.find((d) => d.state === 'online')
      newSelectedId = firstOnline?.id ?? devices[0]?.id ?? null
    }

    set({ devices, selectedId: newSelectedId })
  },

  setSelectedId: (id) => set({ selectedId: id }),

  refresh: () => {
    const api = window.api?.devices
    if (api) {
      void api.list().then(get().setDevices)
    }
  }
}))

// 初始化订阅
if (typeof window !== 'undefined') {
  const api = window.api?.devices
  if (api) {
    void api.list().then(useDevicesStore.getState().setDevices)
    api.onListChanged(useDevicesStore.getState().setDevices)
  }
}
