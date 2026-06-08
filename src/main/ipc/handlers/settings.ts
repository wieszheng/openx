import { dialog, type BrowserWindow } from 'electron'
import { getExportDir, setExportDir, getOcrBaseUrl, setOcrBaseUrl } from '../../settings'

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

export function handleGetOcrBaseUrl(): string {
  return getOcrBaseUrl()
}

export function handleSetOcrBaseUrl(_: unknown, url: string): void {
  setOcrBaseUrl(url)
}
