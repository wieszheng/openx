import type { AgentIntent, PlanStep, PlanUncertainty, StepAssertion } from '../../../shared/agent'
import type { WorkflowNodeType } from '../../../shared/workflow'
import { getDevicesSnapshot } from '../../devices'
import { StreamingWorkflowBuilder, sleep } from './streaming-builder'
import type { PlanEmitter } from './types'

const APP_ALIASES: Record<string, string> = {
  设置: 'com.android.settings',
  微信: 'com.tencent.mm',
  支付宝: 'com.eg.android.AlipayGphone',
  淘宝: 'com.taobao.taobao',
  浏览器: 'com.android.chrome',
  相机: 'com.android.camera2',
  通讯录: 'com.android.contacts',
  电话: 'com.android.dialer',
}

interface ParsedLine {
  raw: string
  step?: PlanStep
  uncertainty?: PlanUncertainty
  parseNote?: string
}

function parseLaunch(line: string, index: number): ParsedLine {
  const m = line.match(/(?:打开|启动|运行)(?:应用)?[「"']?(.+?)[」"']?(?:应用|app)?$/i)
  if (!m) return { raw: line }

  const appName = m[1].trim()
  const pkg = APP_ALIASES[appName]
  if (!pkg) {
    return {
      raw: line,
      parseNote: `应用「${appName}」不在内置别名表，需手动填写包名`,
      uncertainty: {
        stepIndex: index,
        field: 'packageName',
        question: `请确认「${appName}」的包名`,
        candidates: ['com.example.app'],
      },
      step: {
        intent: line,
        type: 'action-launch-app',
        label: `启动 ${appName}`,
        params: { packageName: '', activity: '', cold: true },
        postDelayMs: 2500,
      },
    }
  }

  return {
    raw: line,
    parseNote: `匹配内置别名 → ${pkg}，冷启动并等待 2.5s`,
    step: {
      intent: line,
      type: 'action-launch-app',
      label: `启动 ${appName}`,
      params: { packageName: pkg, activity: '', cold: true },
      postDelayMs: 2500,
    },
  }
}

function parseTap(line: string): ParsedLine | null {
  const m = line.match(/(?:点击|轻触|点)(?:按钮|文字|文本)?[「"']?(.+?)[」"']?$/)
  if (!m) return null
  const text = m[1].trim()
  return {
    raw: line,
    parseNote: `OCR 模糊匹配「${text}」，优于固定坐标`,
    step: {
      intent: line,
      type: 'action-find-and-tap',
      label: `点击 ${text}`,
      params: { targetText: text, matchType: 'contains', action: 'tap' },
      postDelayMs: 1500,
    },
  }
}

function parseInput(line: string): ParsedLine | null {
  const m = line.match(/(?:输入|填写)(?:文字|文本|内容)?[「"']?(.+?)[」"']?(?:到|在)?(?:输入框)?/)
  if (!m) return null
  const text = m[1].trim()
  return {
    raw: line,
    parseNote: `向当前焦点控件输入，长度 ${text.length} 字符`,
    step: {
      intent: line,
      type: 'action-input-text',
      label: `输入 ${text}`,
      params: { text },
      postDelayMs: 1000,
    },
  }
}

function parseDelay(line: string): ParsedLine | null {
  const m = line.match(/(?:等待|延迟)\s*(\d+)\s*(?:秒|s|ms|毫秒)?/)
  if (!m) return null
  let ms = Number(m[1])
  if (!line.includes('ms') && !line.includes('毫秒')) ms *= 1000
  return {
    raw: line,
    parseNote: `显式等待 ${ms}ms，避免页面未渲染完成`,
    step: {
      intent: line,
      type: 'control-delay',
      label: `等待 ${ms}ms`,
      params: { ms },
    },
  }
}

function parseAssert(line: string): ParsedLine | null {
  const m = line.match(/(?:断言|验证|确认|检查)(?:屏幕)?(?:出现|包含|显示)?[「"']?(.+?)[」"']?$/)
  if (!m) return null
  const text = m[1].trim()
  const assertions: StepAssertion[] = [{ type: 'ocr_contains', value: text }]
  return {
    raw: line,
    parseNote: `步骤后 OCR 断言 + find-and-tap assert 双保险`,
    step: {
      intent: line,
      type: 'action-find-and-tap',
      label: `断言 ${text}`,
      params: { targetText: text, matchType: 'contains', action: 'assert' },
      assertions,
    },
  }
}

function parseSwipe(line: string): ParsedLine | null {
  if (!/(?:滑动|上滑|下滑|左滑|右滑)/.test(line)) return null
  const dir = /上滑/.test(line) ? '向上' : /下滑/.test(line) ? '向下' : /左滑/.test(line) ? '向左' : /右滑/.test(line) ? '向右' : '默认'
  return {
    raw: line,
    parseNote: `${dir}滑动 · 使用屏幕中心区域默认坐标（1080p 基准）`,
    step: {
      intent: line,
      type: 'action-swipe',
      label: '滑动屏幕',
      params: { x1: 500, y1: 1500, x2: 500, y2: 500, duration: 400 },
      postDelayMs: 1000,
    },
  }
}

function parseBack(line: string): ParsedLine | null {
  if (!/(?:返回|回退|后退)/.test(line)) return null
  return {
    raw: line,
    parseNote: '发送 Android KEYCODE_BACK (4)',
    step: {
      intent: line,
      type: 'action-key-event',
      label: '按返回键',
      params: { keyCode: 4 },
      postDelayMs: 800,
    },
  }
}

function parseLine(line: string, index: number): ParsedLine {
  const parsers = [parseDelay, parseAssert, parseTap, parseInput, parseSwipe, parseBack]
  for (const p of parsers) {
    const r = p(line)
    if (r) return r
  }
  if (/打开|启动/.test(line)) return parseLaunch(line, index)
  return { raw: line }
}

export async function planWithRules(intent: AgentIntent, emit?: PlanEmitter) {
  const think = emit?.think

  think?.({ kind: 'info', message: '▶ 规则引擎 · 开始意图分析' })
  think?.({ kind: 'info', message: `◆ 原始用例 (${intent.description.length} 字)` })

  if (intent.deviceId) {
    const device = getDevicesSnapshot().find((d) => d.id === intent.deviceId)
    if (device) {
      think?.({ kind: 'info', message: `◆ 目标设备: ${device.displayName} · ${device.platform}` })
      think?.({ kind: 'info', message: '    假设: 设备已连接、已解锁、ADB/HDC 可用' })
    }
  } else {
    think?.({ kind: 'info', message: '◆ 未指定设备，步骤将使用通用参数' })
  }

  think?.({ kind: 'info', message: '◆ 按换行/分号/句号拆分步骤描述…' })

  const lines = intent.description
    .split(/[\n；;。]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  think?.({ kind: 'info', message: `◆ 识别到 ${lines.length} 段描述` })

  const steps: PlanStep[] = []
  const uncertainties: PlanUncertainty[] = []
  const acceptance: StepAssertion[] = []

  lines.forEach((line, lineIdx) => {
    think?.({ kind: 'info', message: `  ── 第 ${lineIdx + 1} 段: 「${line}」` })

    if (/最终|验收|结果/.test(line)) {
      const m = line.match(/[「"']?(.+?)[」"']?$/)
      if (m) {
        acceptance.push({ type: 'ocr_contains', value: m[1].trim() })
        think?.({ kind: 'info', message: `    归类为验收条件 · OCR 包含「${m[1].trim()}」` })
      }
      return
    }

    const parsed = parseLine(line, steps.length)
    if (parsed.parseNote) {
      think?.({ kind: 'info', message: `    解析: ${parsed.parseNote}` })
    }
    if (parsed.uncertainty) {
      uncertainties.push(parsed.uncertainty)
      think?.({ kind: 'info', message: `    ⚠ 待确认: ${parsed.uncertainty.question}` })
    }
    if (parsed.step) {
      steps.push(parsed.step)
    } else if (!parsed.uncertainty) {
      think?.({ kind: 'info', message: `    ✗ 未能匹配任何规则模板，跳过` })
    }
  })

  if (steps.length === 0) {
    think?.({ kind: 'info', message: '◆ 无有效步骤，插入默认截图节点供手动补充' })
    steps.push({
      intent: intent.description,
      type: 'action-screenshot' as WorkflowNodeType,
      label: '截图（待手动补充步骤）',
      params: { saveToVar: '' },
    })
  }

  const name = intent.description.slice(0, 24) + (intent.description.length > 24 ? '…' : '')

  think?.({ kind: 'info', message: `◆ 共解析 ${steps.length} 步 · ${uncertainties.length} 项待确认 · ${acceptance.length} 条验收` })
  think?.({ kind: 'info', message: '◆ 开始流式写入画布（横向布局）…' })

  const builder = new StreamingWorkflowBuilder(name, intent.description)

  emit?.onStreamInit?.({
    workflowId: builder.workflowIdValue,
    name,
    description: intent.description,
    triggerNode: builder.getTriggerNode(),
  })

  for (const step of steps) {
    await builder.addStep(
      step,
      (payload) => emit?.onStepApplied?.(payload),
      think
    )
    await sleep(100)
  }

  think?.({ kind: 'info', message: `◆ 工作流 DAG 完成 · ${builder.edgeCount} 条边` })
  if (acceptance.length) {
    think?.({ kind: 'info', message: `◆ 用例级验收: ${acceptance.map((a) => a.value).join('、')}` })
  }
  think?.({ kind: 'info', message: '✓ 规则引擎编排完成' })

  return builder.finalize({
    assumptions: [
      '目标应用已安装且可启动',
      '设备已解锁并处于可操作状态',
      'OCR 文字与屏幕实际显示一致（简繁/大小写）',
    ],
    uncertainties,
    plannerSource: 'rule',
    acceptanceCriteria: acceptance,
  })
}
