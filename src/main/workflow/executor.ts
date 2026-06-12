import { BrowserWindow } from 'electron'
import { createLogger } from '../log'
import { IPC } from '../../shared/ipc-channels'
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  ExecutionLog,
  WorkflowNodeType,
} from '../../shared/workflow'
import { shell as adbShell } from '../devices/android/base'
import * as adbActions from '../devices/android/actions'
import * as hdcActions from '../devices/harmony/actions'
import { shell as hdcShell } from '../devices/harmony/base'
import { getGlobalVar, setGlobalVar } from '../settings'
import { getDevicesSnapshot } from '../devices'

const logger = createLogger('workflow:executor')

// ── State ────────────────────────────────────────────────────────────────

let running = false
let stopRequested = false

export function isWorkflowRunning(): boolean {
  return running
}

export function requestStop(): void {
  stopRequested = true
}

// ── Util ─────────────────────────────────────────────────────────────────

function makeLogId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** 将模板 {{varName}} 替换为上下文变量 */
function interpolate(text: string, ctx: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] ?? '')
}

/** 安全 eval 条件表达式，ctx 可用 */
function evalCondition(expression: string, ctx: Record<string, string>): boolean {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('ctx', `"use strict"; return !!(${expression})`)
    return fn(ctx) as boolean
  } catch (e) {
    logger.warn('condition eval failed', { expression, error: e })
    return false
  }
}

// ── Push log to renderer ──────────────────────────────────────────────────

function pushLog(win: BrowserWindow, log: ExecutionLog): void {
  if (!win.isDestroyed()) {
    win.webContents.send(IPC.workflow.log, log)
  }
}

function pushDone(
  win: BrowserWindow,
  status: 'done' | 'error' | 'stopped',
  error?: string
): void {
  if (!win.isDestroyed()) {
    win.webContents.send(IPC.workflow.done, { status, error })
  }
}

// ── Build adjacency map ──────────────────────────────────────────────────

interface AdjEntry {
  targetId: string
  sourceHandle?: string
}

function buildAdj(edges: WorkflowEdge[]): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>()
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, [])
    adj.get(e.source)!.push({ targetId: e.target, sourceHandle: e.sourceHandle })
  }
  return adj
}

// ── Execute a single node ────────────────────────────────────────────────

async function executeNode(
  node: WorkflowNode,
  deviceId: string | undefined,
  ctx: Record<string, string>
): Promise<{ ok: boolean; output?: string; branchHandle?: string; imageData?: string }> {
  const platform = getDevicesSnapshot().find((d) => d.id === deviceId)?.platform ?? 'android'
  const isAndroid = platform === 'android'
  const serial = getDevicesSnapshot().find((d) => d.id === deviceId)?.connectionKey ?? deviceId ?? 'default'

  const p = node.params as Record<string, unknown>

  switch (node.type as WorkflowNodeType) {
    // ── Triggers ──────────────────────────────────────────────────────
    case 'trigger-manual':
      return { ok: true, output: '手动触发' }

    // ── Actions ───────────────────────────────────────────────────────
    case 'action-tap': {
      const x = Number(p.x ?? 0)
      const y = Number(p.y ?? 0)
      if (isAndroid) {
        await adbActions.tap(serial, x, y)
      } else {
        await hdcActions.tap(serial, x, y)
      }
      return { ok: true, output: `点击坐标 (${x}, ${y})` }
    }

    case 'action-double-tap': {
      const x = Number(p.x ?? 0)
      const y = Number(p.y ?? 0)
      if (isAndroid) {
        await adbActions.doubleTap(serial, x, y)
      } else {
        await hdcActions.doubleTap(serial, x, y)
      }
      return { ok: true, output: `双击坐标 (${x}, ${y})` }
    }

    case 'action-long-click': {
      const x = Number(p.x ?? 0)
      const y = Number(p.y ?? 0)
      const dur = Number(p.duration ?? 2000)
      if (isAndroid) {
        await adbActions.longClick(serial, x, y, dur)
      } else {
        await hdcActions.longClick(serial, x, y, dur)
      }
      return { ok: true, output: `长按坐标 (${x}, ${y}) ${dur}ms` }
    }

    case 'action-swipe': {
      const x1 = Number(p.x1 ?? 0), y1 = Number(p.y1 ?? 0)
      const x2 = Number(p.x2 ?? 0), y2 = Number(p.y2 ?? 0)
      const dur = Number(p.duration ?? 300)
      if (isAndroid) {
        await adbActions.swipe(serial, x1, y1, x2, y2, dur)
      } else {
        await hdcActions.swipe(serial, x1, y1, x2, y2, dur)
      }
      return { ok: true, output: `滑动 (${x1},${y1}) → (${x2},${y2}) ${dur}ms` }
    }

    case 'action-drag': {
      const x1 = Number(p.x1 ?? 0), y1 = Number(p.y1 ?? 0)
      const x2 = Number(p.x2 ?? 0), y2 = Number(p.y2 ?? 0)
      const dur = Number(p.duration ?? 500)
      if (isAndroid) {
        await adbActions.drag(serial, x1, y1, x2, y2, dur)
      } else {
        await hdcActions.drag(serial, x1, y1, x2, y2, dur)
      }
      return { ok: true, output: `拖拽 (${x1},${y1}) → (${x2},${y2}) ${dur}ms` }
    }

    case 'action-input-text': {
      const text = interpolate(String(p.text ?? ''), ctx)
      const x = p.x != null ? Number(p.x) : null
      const y = p.y != null ? Number(p.y) : null
      if (isAndroid) {
        // Android：先 tap 聚焦，再 inputText
        if (x !== null && y !== null) await adbActions.tap(serial, x, y)
        await adbActions.inputText(serial, text)
      } else {
        // 鸿蒙：坐标直接作为 uitest inputText 的参数
        await hdcActions.inputText(serial, text, x ?? 0, y ?? 0)
      }
      return { ok: true, output: `输入文字: ${text}${x !== null ? ` (${x},${y})` : ''}` }
    }

    case 'action-clear-text': {
      const len = Number(p.length ?? 100)
      if (isAndroid) {
        await adbActions.clearText(serial, len)
      } else {
        await hdcActions.clearText(serial, len)
      }
      return { ok: true, output: `清除文字（最多 ${len} 个字符）` }
    }

    case 'action-key-event': {
      const keyCode = Number(p.keyCode ?? 4)
      if (isAndroid) {
        await adbActions.keyEvent(serial, keyCode)
      } else {
        await hdcActions.keyEvent(serial, keyCode)
      }
      return { ok: true, output: `按键事件 keyCode=${keyCode}` }
    }

    case 'action-screenshot': {
      const base64 = isAndroid
        ? await adbActions.screenshot(serial)
        : await hdcActions.screenshot(serial)
      const mime = isAndroid ? 'image/png' : 'image/jpeg'
      const imageData = `data:${mime};base64,${base64}`
      const saveToVar = String(p.saveToVar ?? '')
      if (saveToVar) {
        ctx[saveToVar] = base64
      }
      return { ok: true, output: `截图成功${saveToVar ? `，已存入变量 ${saveToVar}` : ''}`, imageData }
    }

    case 'action-shell': {
      const cmd = interpolate(String(p.command ?? ''), ctx)
      const output = isAndroid
        ? await adbShell(serial, cmd)
        : await hdcShell(serial, cmd)
      const saveToVar = String(p.saveToVar ?? '')
      if (saveToVar) ctx[saveToVar] = output
      return { ok: true, output }
    }

    case 'action-install-app': {
      const packagePath = interpolate(String(p.packagePath ?? ''), ctx)
      if (isAndroid) {
        await adbActions.installApp(serial, packagePath)
      } else {
        await hdcActions.installApp(serial, packagePath)
      }
      return { ok: true, output: `已安装 ${packagePath}` }
    }

    case 'action-uninstall-app': {
      const packageName = interpolate(String(p.packageName ?? ''), ctx)
      if (isAndroid) {
        await adbActions.uninstallApp(serial, packageName)
      } else {
        await hdcActions.uninstallApp(serial, packageName)
      }
      return { ok: true, output: `已卸载 ${packageName}` }
    }

    case 'action-launch-app': {
      const packageName = interpolate(String(p.packageName ?? ''), ctx)
      const activity = p.activity ? String(p.activity) : "EntryAbility"
      const cold = Boolean(p.cold ?? false)
      if (isAndroid) {
        await adbActions.launchApp(serial, packageName, cold)
      } else {
        await hdcActions.launchApp(serial, packageName, activity, cold)
      }
      return { ok: true, output: `${cold ? '冷启动' : '热启动'}应用 ${packageName}` }
    }

    case 'action-close-app': {
      const packageName = interpolate(String(p.packageName ?? ''), ctx)
      if (isAndroid) {
        await adbActions.closeApp(serial, packageName)
      } else {
        await hdcActions.closeApp(serial, packageName)
      }
      return { ok: true, output: `已关闭应用 ${packageName}` }
    }

    case 'action-find-and-tap': {
      const targetText = interpolate(String(p.targetText ?? ''), ctx)
      const matchType = String(p.matchType ?? 'contains') as 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex'
      const action = String(p.action ?? 'tap') as 'tap' | 'doubleTap' | 'longPress' | 'input' | 'assert'
      const inputText = p.text ? interpolate(String(p.text), ctx) : ''

      // 1. 截图
      const b64 = isAndroid
        ? await adbActions.screenshot(serial)
        : await hdcActions.screenshot(serial)

      // 2. OCR
      const ocrUrl = ctx['__baseUrl'] ?? 'http://127.0.0.1:8000'
      const ocrRes = await fetch(`${ocrUrl}/api/v1/ocr/base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64, use_cls: true, use_det: true, use_rec: true }),
        signal: AbortSignal.timeout(15000),
      })
      const ocrJson = (await ocrRes.json()) as { data?: { text: string; box: [[number,number],[number,number],[number,number],[number,number]] }[] }

      // 3. 匹配
      const items = ocrJson.data ?? []
      function matchText(t: string): boolean {
        if (matchType === 'equals')     return t === targetText
        if (matchType === 'startsWith') return t.startsWith(targetText)
        if (matchType === 'endsWith')   return t.endsWith(targetText)
        if (matchType === 'regex')      return new RegExp(targetText).test(t)
        return t.includes(targetText)  // contains (default)
      }
      const match = items.find((item) => matchText(item.text))

      // assert：仅判断是否存在
      if (action === 'assert') {
        return { ok: !!match, output: match ? `断言通过：找到「${match.text}」` : `断言失败：未找到文字「${targetText}」` }
      }

      if (!match) return { ok: false, output: `OCR 未找到文字「${targetText}」` }

      // 4. 取框中心坐标
      const xs = match.box.map((pt) => pt[0])
      const ys = match.box.map((pt) => pt[1])
      const cx = Math.round((Math.min(...xs) + Math.max(...xs)) / 2)
      const cy = Math.round((Math.min(...ys) + Math.max(...ys)) / 2)

      if (p.saveToVar)     ctx[String(p.saveToVar)]     = `${cx},${cy}`
      if (p.saveTextToVar) ctx[String(p.saveTextToVar)] = match.text

      // 5. 执行操作
      if (action === 'input') {
        if (isAndroid) { await adbActions.inputText(serial, inputText) }
        else           { await hdcActions.inputText(serial, inputText, cx, cy) }
        return { ok: true, output: `OCR 找到「${match.text}」@ (${cx},${cy})，已输入: ${inputText}` }
      }
      if (action === 'doubleTap') {
        if (isAndroid) { await adbActions.doubleTap(serial, cx, cy) }
        else           { await hdcActions.doubleTap(serial, cx, cy) }
        return { ok: true, output: `OCR 找到「${match.text}」@ (${cx},${cy})，已双击` }
      }
      if (action === 'longPress') {
        if (isAndroid) { await adbActions.longClick(serial, cx, cy) }
        else           { await hdcActions.longClick(serial, cx, cy) }
        return { ok: true, output: `OCR 找到「${match.text}」@ (${cx},${cy})，已长按` }
      }
      // tap (default)
      if (isAndroid) { await adbActions.tap(serial, cx, cy) }
      else           { await hdcActions.tap(serial, cx, cy) }
      return { ok: true, output: `OCR 找到「${match.text}」@ (${cx},${cy})，已点击` }
    }

    case 'action-get-var': {
      const key = String(p.key ?? '')
      const saveToVar = String(p.saveToVar ?? key)
      const value = getGlobalVar(key) ?? ''
      ctx[saveToVar] = value
      return { ok: true, output: `读取全局变量 ${key} = ${value}` }
    }

    case 'action-set-var': {
      const key = String(p.key ?? '')
      const value = interpolate(String(p.value ?? ''), ctx)
      setGlobalVar(key, value)
      ctx[key] = value
      return { ok: true, output: `设置全局变量 ${key} = ${value}` }
    }

    // ── Control Flow ──────────────────────────────────────────────────
    case 'control-delay': {
      const ms = Number(p.ms ?? 1000)
      await new Promise((r) => setTimeout(r, ms))
      return { ok: true, output: `等待 ${ms}ms` }
    }

    case 'control-if': {
      const condition = interpolate(String(p.condition ?? 'false'), ctx)
      const result = evalCondition(condition, ctx)
      return { ok: true, output: `条件 [${condition}] → ${result ? 'true ✓' : 'false ✗'}`, branchHandle: result ? 'yes' : 'no' }
    }

    case 'control-loop': {
      // loop节点本身只是标记，由 traverseFrom 处理实际循环
      return { ok: true, output: `循环节点 (由执行引擎管控)` }
    }

    default:
      return { ok: false, output: `未知节点类型: ${node.type}` }
  }
}

// ── DAG Traversal ────────────────────────────────────────────────────────

async function traverseFrom(
  nodeId: string,
  nodes: Map<string, WorkflowNode>,
  adj: Map<string, AdjEntry[]>,
  deviceId: string | undefined,
  ctx: Record<string, string>,
  win: BrowserWindow,
  loopCount?: number // 上层传递的剩余循环次数（undefined 表示普通执行）
): Promise<void> {
  if (stopRequested) return

  const node = nodes.get(nodeId)
  if (!node) return

  const startTime = Date.now()
  const logEntry: ExecutionLog = {
    id: makeLogId(),
    nodeId: node.id,
    nodeType: node.type,
    nodeLabel: node.label,
    status: 'running',
    timestamp: startTime,
  }
  pushLog(win, logEntry)

  let result: { ok: boolean; output?: string; branchHandle?: string; imageData?: string }
  try {
    result = await executeNode(node, deviceId, ctx)
    // 延迟在节点内部等待，running 状态持续到等待结束
    if (result.ok && node.postDelayMs && node.postDelayMs > 0 && !stopRequested) {
      await new Promise((res) => setTimeout(res, node.postDelayMs))
    }
  } catch (e) {
    result = { ok: false, output: e instanceof Error ? e.message : String(e) }
  }

  const duration = Date.now() - startTime
  const finalLog: ExecutionLog = {
    ...logEntry,
    status: result.ok ? 'success' : 'error',
    output: result.output,
    imageData: result.imageData,
    duration,
  }
  pushLog(win, finalLog)

  if (!result.ok || stopRequested) return

  // 获取后续节点
  const nexts = adj.get(nodeId) ?? []

  // ── 控制流特殊处理 ────────────────────────────────────────────────
  if (node.type === 'control-if') {
    const branchHandle = result.branchHandle ?? 'yes'
    const target = nexts.find((n) => n.sourceHandle === branchHandle) ?? nexts[0]
    if (target) await traverseFrom(target.targetId, nodes, adj, deviceId, ctx, win)
    return
  }

  if (node.type === 'control-loop') {
    const count = loopCount ?? Number((node.params as { count?: number }).count ?? 1)
    const bodyTarget = nexts.find((n) => n.sourceHandle === 'loop-body') ?? nexts[0]
    const doneTarget = nexts.find((n) => n.sourceHandle === 'loop-done')

    if (bodyTarget) {
      for (let i = 0; i < count; i++) {
        if (stopRequested) break
        ctx['__loopIndex'] = String(i)
        await traverseFrom(bodyTarget.targetId, nodes, adj, deviceId, ctx, win)
      }
    }
    if (doneTarget && !stopRequested) {
      await traverseFrom(doneTarget.targetId, nodes, adj, deviceId, ctx, win)
    }
    return
  }

  // ── 普通串行执行 ──────────────────────────────────────────────────
  for (const next of nexts) {
    if (stopRequested) break
    await traverseFrom(next.targetId, nodes, adj, deviceId, ctx, win)
  }
}

// ── Main Entry ───────────────────────────────────────────────────────────

export async function runWorkflow(
  workflow: Workflow,
  deviceId: string | undefined,
  win: BrowserWindow,
  baseUrl = 'http://127.0.0.1:8000'
): Promise<void> {
  if (running) {
    logger.warn('workflow already running')
    return
  }

  running = true
  stopRequested = false

  logger.info('workflow started', { id: workflow.id, name: workflow.name, deviceId })

  // 构建快速查找 map
  const nodes = new Map<string, WorkflowNode>(workflow.nodes.map((n) => [n.id, n]))
  const adj = buildAdj(workflow.edges)

  // 运行时上下文变量
  const ctx: Record<string, string> = { __baseUrl: baseUrl }

  // 找到 trigger 节点作为入口
  const triggers = workflow.nodes.filter((n) => n.type.startsWith('trigger-'))
  if (triggers.length === 0) {
    pushDone(win, 'error', '工作流中没有触发器节点')
    running = false
    return
  }

  try {
    for (const trigger of triggers) {
      if (stopRequested) break
      await traverseFrom(trigger.id, nodes, adj, deviceId, ctx, win)
    }

    if (stopRequested) {
      logger.info('workflow stopped by user')
      pushDone(win, 'stopped')
    } else {
      logger.info('workflow done')
      pushDone(win, 'done')
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error('workflow error', { error: msg })
    pushDone(win, 'error', msg)
  } finally {
    running = false
    stopRequested = false
  }
}

export async function runSingleNode(
  node: WorkflowNode,
  deviceId: string | undefined,
  win: BrowserWindow,
  baseUrl = 'http://127.0.0.1:8000'
): Promise<void> {
  if (running) { logger.warn('workflow already running'); return }
  running = true
  stopRequested = false

  const ctx: Record<string, string> = { __baseUrl: baseUrl }
  const startTime = Date.now()
  const logEntry: ExecutionLog = {
    id: makeLogId(),
    nodeId: node.id,
    nodeType: node.type,
    nodeLabel: node.label,
    status: 'running',
    timestamp: startTime,
  }
  pushLog(win, logEntry)

  let result: { ok: boolean; output?: string; imageData?: string }
  try {
    result = await executeNode(node, deviceId, ctx)
  } catch (e) {
    result = { ok: false, output: e instanceof Error ? e.message : String(e) }
  }

  pushLog(win, {
    ...logEntry,
    status: result.ok ? 'success' : 'error',
    output: result.output,
    imageData: result.imageData,
    duration: Date.now() - startTime,
  })
  pushDone(win, result.ok ? 'done' : 'error', result.ok ? undefined : result.output)
  running = false
  stopRequested = false
}
