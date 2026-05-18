import { getHdcClient } from './client'

export interface TrackerHandle {
  stop: () => void
}

/** 启动 Harmony 设备追踪 */
export async function startHarmonyTracker(onEvent: () => void): Promise<TrackerHandle> {
  const tracker = await getHdcClient().trackTargets()

  const notify = (): void => {
    onEvent()
  }

  tracker.on('add', notify)
  tracker.on('remove', notify)
  tracker.on('error', notify)

  notify()

  return {
    stop: () => {
      tracker.removeAllListeners()
      tracker.end()
    }
  }
}
