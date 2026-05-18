import { getAdbClient } from './client'

export interface TrackerHandle {
  stop: () => void
}

/** 启动 Android 设备追踪 */
export async function startAndroidTracker(onEvent: () => void): Promise<TrackerHandle> {
  const tracker = await getAdbClient().trackDevices()

  const notify = (): void => {
    onEvent()
  }

  tracker.on('add', notify)
  tracker.on('remove', notify)
  tracker.on('change', notify)
  tracker.on('changeSet', notify)
  tracker.on('error', notify)

  notify()

  return {
    stop: () => {
      tracker.removeAllListeners()
      tracker.end()
    }
  }
}
