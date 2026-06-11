import { dialog, type BrowserWindow } from 'electron'
import { getExportDir, getLlmSettings, setExportDir, setLlmSettings } from '../../settings'
import type { LlmSettings } from '../../../shared/agent'

export async function handleOpenFolder(
  getMainWindow: () => BrowserWindow | null,
): Promise<string | null> {
  const win = getMainWindow()
  const result = await dialog.showOpenDialog(win ?? undefined!, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择目录',
  })
  return result.canceled ? null : (result.filePaths[0] ?? null)
}

export async function handleOpenFile(
  getMainWindow: () => BrowserWindow | null,
): Promise<string | null> {
  const win = getMainWindow()
  const result = await dialog.showOpenDialog(win ?? undefined!, {
    properties: ['openFile'],
    title: '选择文件',
  })
  return result.canceled ? null : (result.filePaths[0] ?? null)
}

export function handleGetExportDir(): string | null {
  return getExportDir()
}

export function handleSetExportDir(_: unknown, dir: string): void {
  setExportDir(dir)
}

export function handleGetLlmSettings(): LlmSettings {
  return getLlmSettings()
}

export function handleSetLlmSettings(_: unknown, patch: Partial<LlmSettings>): void {
  setLlmSettings(patch)
}
