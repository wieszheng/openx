import { createLogger } from '../../log'
import { shell } from './base'
import { getAdbClient } from './client'
import { captureAndroidScreenshot } from './screencap'
import { installAndroidApp, uninstallAndroidApp } from './app-control'

const logger = createLogger('adbActions')

// ── 触摸操作 ──────────────────────────────────────────────────────────────

/**
 * 单击坐标。用短距 swipe 模拟，比 input tap 对更多应用（游戏等）更可靠。
 */
export async function tap(serial: string, x: number, y: number): Promise<void> {
  logger.debug('tap', { serial, x, y })
  await shell(serial, `input swipe ${x} ${y} ${x} ${y} 150`)
}

export async function doubleTap(serial: string, x: number, y: number): Promise<void> {
  logger.debug('doubleTap', { serial, x, y })
  await shell(serial, [`input tap ${x} ${y}`, `input tap ${x} ${y}`])
}

export async function longClick(
  serial: string,
  x: number,
  y: number,
  duration = 2000,
): Promise<void> {
  logger.debug('longClick', { serial, x, y, duration })
  await shell(serial, `input swipe ${x} ${y} ${x} ${y} ${duration}`)
}

// ── 手势操作 ──────────────────────────────────────────────────────────────

export async function swipe(
  serial: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  duration: number,
): Promise<void> {
  logger.debug('swipe', { serial, x1, y1, x2, y2, duration })
  await shell(serial, `input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`)
}

export async function drag(
  serial: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  duration: number,
): Promise<void> {
  logger.debug('drag', { serial, x1, y1, x2, y2, duration })
  await shell(serial, `input draganddrop ${x1} ${y1} ${x2} ${y2} ${duration}`)
}

// ── 文字输入 ──────────────────────────────────────────────────────────────

/**
 * 向当前焦点控件输入文字。
 * 空格用 %s 替换（input text 的 shell 转义要求）。
 */
export async function inputText(serial: string, text: string): Promise<void> {
  logger.debug('inputText', { serial, text })
  const escaped = text.replace(/ /g, '%s').replace(/"/g, '\\"')
  await shell(serial, `input text "${escaped}"`)
}

/** 清除当前焦点文本框，length 为最大删除字符数，默认 100 */
export async function clearText(serial: string, length = 100): Promise<void> {
  logger.debug('clearText', { serial, length })
  await getAdbClient().getDevice(serial).clearTextField(length)
}

// ── 按键事件 ──────────────────────────────────────────────────────────────

export async function keyEvent(serial: string, keyCode: number | string): Promise<void> {
  logger.debug('keyEvent', { serial, keyCode })
  await shell(serial, `input keyevent ${keyCode}`)
}

/** 返回键（KEYCODE_BACK = 4） */
export async function pressBack(serial: string): Promise<void> {
  await keyEvent(serial, 4)
}

/** Home 键（KEYCODE_HOME = 3） */
export async function pressHome(serial: string): Promise<void> {
  await keyEvent(serial, 3)
}

/** 最近任务键（KEYCODE_APP_SWITCH = 187） */
export async function pressRecent(serial: string): Promise<void> {
  await keyEvent(serial, 187)
}

// ── 布局与屏幕信息 ────────────────────────────────────────────────────────

/** 返回 UI 层级 XML（UIAutomator dump），可用于 AI 元素定位 */
export async function dumpLayout(serial: string): Promise<string> {
  logger.debug('dumpLayout', { serial })
  return shell(serial, 'uiautomator dump /dev/tty 2>/dev/null')
}

/** 返回屏幕物理分辨率 */
export async function getScreenSize(
  serial: string,
): Promise<{ width: number; height: number }> {
  logger.debug('getScreenSize', { serial })
  const output = await shell(serial, 'wm size')
  // "Physical size: 1080x2400" 或 "Override size: ...\nPhysical size: 1080x2400"
  const match = output.match(/Physical size:\s*(\d+)x(\d+)/) ?? output.match(/(\d+)x(\d+)/)
  if (!match) throw new Error(`无法解析屏幕分辨率: ${output}`)
  return { width: Number(match[1]), height: Number(match[2]) }
}

// ── Re-exports ────────────────────────────────────────────────────────────

export { captureAndroidScreenshot as screenshot }
export { installAndroidApp as installApp }
export { uninstallAndroidApp as uninstallApp }
