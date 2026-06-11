import type { AssertionResult, Checkpoint, StepAssertion } from '../../shared/agent'
import { captureDeviceScreenshot } from '../devices/screencap'
import { createLogger } from '../log'

const logger = createLogger('agent:asserter')

async function fetchOcr(base64: string, baseUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/ocr/base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, use_cls: true, use_det: true, use_rec: true }),
      signal: AbortSignal.timeout(15000),
    })
    const json = (await res.json()) as { data?: { text: string }[] }
    return (json.data ?? []).map((d) => d.text)
  } catch (e) {
    logger.warn('asserter ocr failed', { error: e instanceof Error ? e.message : String(e) })
    return []
  }
}

function ocrTextsFromCheckpoint(cp: Checkpoint): string[] {
  return (cp.ocrItems ?? []).map((i) => i.text)
}

function evalOne(
  assertion: StepAssertion,
  ocrTexts: string[],
  output: string | undefined,
  ctx: Record<string, string>
): AssertionResult {
  const allText = ocrTexts.join(' ')
  const expected = assertion.value

  switch (assertion.type) {
    case 'ocr_contains':
      return {
        assertion,
        ok: ocrTexts.some((t) => t.includes(expected)) || allText.includes(expected),
        expected: `屏幕包含「${expected}」`,
        actual: allText.slice(0, 120) || '(无 OCR 结果)',
      }
    case 'ocr_not_contains':
      return {
        assertion,
        ok: !ocrTexts.some((t) => t.includes(expected)) && !allText.includes(expected),
        expected: `屏幕不包含「${expected}」`,
        actual: allText.slice(0, 120) || '(无 OCR 结果)',
      }
    case 'ocr_equals':
      return {
        assertion,
        ok: ocrTexts.some((t) => t === expected),
        expected: `屏幕文字等于「${expected}」`,
        actual: ocrTexts.slice(0, 5).join(' | ') || '(无 OCR 结果)',
      }
    case 'var_equals': {
      const actual = assertion.varKey ? (ctx[assertion.varKey] ?? '') : ''
      return {
        assertion,
        ok: actual === expected,
        expected: `变量 ${assertion.varKey} = 「${expected}」`,
        actual: actual || '(空)',
      }
    }
    case 'output_contains':
      return {
        assertion,
        ok: (output ?? '').includes(expected),
        expected: `输出包含「${expected}」`,
        actual: output?.slice(0, 120) ?? '(无输出)',
      }
    default:
      return {
        assertion,
        ok: false,
        expected: String(assertion.type),
        actual: '未知断言类型',
      }
  }
}

export async function evaluateAssertions(
  assertions: StepAssertion[],
  checkpoint: Checkpoint,
  ctx: Record<string, string>,
  deviceId: string | undefined,
  baseUrl: string
): Promise<AssertionResult[]> {
  let ocrTexts = ocrTextsFromCheckpoint(checkpoint)

  if (ocrTexts.length === 0 && deviceId) {
    try {
      const { data } = await captureDeviceScreenshot(deviceId)
      ocrTexts = await fetchOcr(data, baseUrl)
    } catch {
      /* use empty */
    }
  }

  return assertions.map((a) => evalOne(a, ocrTexts, checkpoint.output, ctx))
}

export function allAssertionsPassed(results: AssertionResult[]): boolean {
  return results.every((r) => r.ok)
}
