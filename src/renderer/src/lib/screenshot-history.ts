export interface ScreenshotHistoryItem {
  id: string
  dataUrl: string
  createdAt: number
  deviceId?: string
  deviceName?: string
}

export type StitchDirection = 'horizontal' | 'vertical'

export const MAX_SCREENSHOT_HISTORY = 20

export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = dataUrl
  })
}

/** 将多张图片按横向或纵向等比缩放后拼接为一张 PNG data URL */
export async function stitchImages(
  dataUrls: string[],
  direction: StitchDirection,
): Promise<string> {
  if (dataUrls.length === 0) {
    throw new Error('请至少选择一张图片')
  }

  const images = await Promise.all(dataUrls.map(loadImageFromDataUrl))
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建画布')
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 1, 1)

  if (direction === 'horizontal') {
    const height = Math.max(...images.map((img) => img.naturalHeight))
    const scaledWidths = images.map((img) => (img.naturalWidth * height) / img.naturalHeight)
    const totalWidth = scaledWidths.reduce((sum, w) => sum + w, 0)

    canvas.width = Math.max(1, Math.round(totalWidth))
    canvas.height = Math.max(1, Math.round(height))
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    let x = 0
    for (let i = 0; i < images.length; i++) {
      const w = scaledWidths[i]
      ctx.drawImage(images[i], x, 0, w, height)
      x += w
    }
  } else {
    const width = Math.max(...images.map((img) => img.naturalWidth))
    const scaledHeights = images.map((img) => (img.naturalHeight * width) / img.naturalWidth)
    const totalHeight = scaledHeights.reduce((sum, h) => sum + h, 0)

    canvas.width = Math.max(1, Math.round(width))
    canvas.height = Math.max(1, Math.round(totalHeight))
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    let y = 0
    for (let i = 0; i < images.length; i++) {
      const h = scaledHeights[i]
      ctx.drawImage(images[i], 0, y, width, h)
      y += h
    }
  }

  return canvas.toDataURL('image/png')
}

export function formatHistoryTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}