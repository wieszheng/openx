import { ipcMain } from 'electron'
import { getDevicesSnapshot, startDeviceDiscovery, stopDeviceDiscovery } from './orchestrator'

export function registerDeviceIpc(): void {
  ipcMain.handle('devices:list', () => getDevicesSnapshot())
}

export async function initDeviceDiscovery(): Promise<void> {
  await startDeviceDiscovery()
}

export function disposeDeviceDiscovery(): void {
  stopDeviceDiscovery()
}
