import { captureDeviceScreenshot } from '../devices/screencap'
import { createLogger } from '../log'
import type { Checkpoint, OcrItem } from '../../shared/agent'
import type { WorkflowNode } from '../../shared/workflow'

const logger = createLogger('agent:checkpoint')

async function ocrImage(base64: string, baseUrl: string): Promise<OcrItem[]> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/ocr/base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, use_cls: true, use_det: true, use_rec: true }),
      signal: AbortSignal.timeout(15000),
    })
    const json = (await res.json()) as {
      data?: { text: string; box: OcrItem['box'] }[]
    }
    return json.data ?? []
  } catch (e) {
    logger.warn('ocr failed', { error: e instanceof Error ? e.message : String(e) })
    return []
  }
}

export async function captureCheckpoint(
  node: WorkflowNode,
  deviceId: string | undefined,
  baseUrl: string,
  ok: boolean,
  output?: string,
  duration?: number,
  skipOcr = false
): Promise<Checkpoint> {
  const checkpoint: Checkpoint = {
    nodeId: node.id,
    nodeLabel: node.label,
    nodeType: node.type,
    timestamp: Date.now(),
    ok,
    output,
    duration,
  }

  if (!deviceId) return checkpoint

  try {
    const { data, mimeType } = await captureDeviceScreenshot(deviceId)
    checkpoint.screenshotBase64 = data
    checkpoint.screenshotMime = mimeType

    if (!skipOcr && data) {
      checkpoint.ocrItems = await ocrImage(data, baseUrl)
    }
  } catch (e) {
    logger.warn('screenshot failed', { nodeId: node.id, error: e instanceof Error ? e.message : String(e) })
  }

  return checkpoint
}
