import { createLogger } from '../../log'
import { shell } from './base'
import { captureHarmonyScreenshot } from './screencap'
import { startHarmonyApp, stopHarmonyApp, installHarmonyApp, uninstallHarmonyApp } from './app-control'

const logger = createLogger('hdcActions')

// ── 触摸操作 ──────────────────────────────────────────────────────────────

export async function tap(connectKey: string, x: number, y: number): Promise<void> {
  logger.debug('tap', { connectKey, x, y })
  await shell(connectKey, `uitest uiInput click ${x} ${y}`)
}

export async function doubleTap(connectKey: string, x: number, y: number): Promise<void> {
  logger.debug('doubleTap', { connectKey, x, y })
  await shell(connectKey, `uitest uiInput doubleClick ${x} ${y}`)
}

export async function longClick(
  connectKey: string,
  x: number,
  y: number,
  _duration?: number, // uitest 不支持时长参数，保留以与 android 接口对齐
): Promise<void> {
  logger.debug('longClick', { connectKey, x, y })
  await shell(connectKey, `uitest uiInput longClick ${x} ${y}`)
}

// ── 手势操作 ──────────────────────────────────────────────────────────────

export async function swipe(
  connectKey: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  duration: number,
): Promise<void> {
  logger.debug('swipe', { connectKey, x1, y1, x2, y2, duration })
  await shell(connectKey, `uitest uiInput swipe ${x1} ${y1} ${x2} ${y2} ${duration}`)
}

export async function fling(
  connectKey: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  speed: number,
): Promise<void> {
  logger.debug('fling', { connectKey, x1, y1, x2, y2, speed })
  await shell(connectKey, `uitest uiInput flingFromTo ${x1} ${y1} ${x2} ${y2} ${speed}`)
}

export async function drag(
  connectKey: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  speed: number,
): Promise<void> {
  logger.debug('drag', { connectKey, x1, y1, x2, y2, speed })
  await shell(connectKey, `uitest uiInput drag ${x1} ${y1} ${x2} ${y2} ${speed}`)
}

// ── 文字输入 ──────────────────────────────────────────────────────────────

/**
 * 向指定坐标的文本框输入文字。
 * uitest inputText 需要控件坐标；x/y 默认 0 时以当前焦点控件为目标。
 */
export async function inputText(connectKey: string, text: string, x = 0, y = 0): Promise<void> {
  logger.debug('inputText', { connectKey, text, x, y })
  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  await shell(connectKey, `uitest uiInput inputText ${x} ${y} "${escaped}"`)
}

/** 清除当前焦点文本框内容，length 为最大清除字符数，默认 100 */
export async function clearText(connectKey: string, length = 100): Promise<void> {
  logger.debug('clearText', { connectKey, length })
  await shell(connectKey, `uitest uiInput clearText ${length}`)
}

// ── 按键事件 ──────────────────────────────────────────────────────────────

/** 发送 HarmonyOS 虚拟按键事件（keyCode 为数字编码） */
export async function keyEvent(connectKey: string, keyCode: number | string): Promise<void> {
  logger.debug('keyEvent', { connectKey, keyCode })
  await shell(connectKey, `uitest uiInput keyEvent ${keyCode}`)
}

/** 返回键（keyCode 2） */
export async function pressBack(connectKey: string): Promise<void> {
  await keyEvent(connectKey, 2)
}

/** Home 键（keyCode 1） */
export async function pressHome(connectKey: string): Promise<void> {
  await keyEvent(connectKey, 1)
}

/** 最近任务键（keyCode 3） */
export async function pressRecent(connectKey: string): Promise<void> {
  await keyEvent(connectKey, 3)
}

// ── 布局与屏幕信息 ────────────────────────────────────────────────────────

/** 获取当前屏幕 UI 布局，返回 JSON 字符串（用于 AI 元素定位等场景） */
export async function dumpLayout(connectKey: string): Promise<string> {
  logger.debug('dumpLayout', { connectKey })
  return shell(connectKey, 'uitest dumpLayout')
}

// ── Re-exports ────────────────────────────────────────────────────────────

export async function launchApp(connectKey: string, packageName: string, ability?: string, cold = false): Promise<void> {
  logger.debug('launchApp', { connectKey, packageName, cold })
  if (cold) await stopHarmonyApp(connectKey, packageName)
  const abilityName = ability?.trim() || `${packageName}.MainAbility`
  await startHarmonyApp(connectKey, packageName, abilityName)
}

export async function closeApp(connectKey: string, packageName: string): Promise<void> {
  logger.debug('closeApp', { connectKey, packageName })
  await stopHarmonyApp(connectKey, packageName)
}

export { captureHarmonyScreenshot as screenshot }
export { installHarmonyApp as installApp }
export { uninstallHarmonyApp as uninstallApp }
