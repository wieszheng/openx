/**
 * ActionSpace —— LLM 可见动作的单一事实来源
 *
 *   1. 系统提示词的动作清单（见 ./prompts.ts，从 params 自动生成）
 *   2. add_workflow_nodes / run_live_action 执行前的参数校验
 *
 * canvas 类动作的参数严格对照 src/shared/workflow.ts 的 *Params 接口，
 * 以及主进程 src/main/workflow/executor.ts 的实际取值，避免提示词与执行端漂移。
 */
import type { ActionDef, ActionCategory } from './types'

// ── 画布编排动作（写入 React Flow 节点）─────────────────────────────────────
// 对照 shared/workflow.ts 的 *Params 与 executor.ts 的 executeNode 取值。

export const CANVAS_ACTIONS: ActionDef[] = [
  {
    name: 'action-launch-app',
    label: '启动应用',
    description: '启动指定包名的应用。cold=true 时先 force-stop 再启动（冷启动）。',
    category: 'canvas',
    params: {
      packageName: { type: 'string', required: true, description: '应用包名，如 com.tencent.mm' },
      activity: { type: 'string', description: '可选，鸿蒙的 mainAbility；Android 一般可省略' },
      cold: { type: 'boolean', default: false, description: 'true=冷启动，false=热启动' }
    },
    sample: { packageName: 'com.tencent.mm', cold: true }
  },
  {
    name: 'action-close-app',
    label: '关闭应用',
    description: '强制停止指定包名的应用。',
    category: 'canvas',
    params: {
      packageName: { type: 'string', required: true, description: '要关闭的应用包名' }
    },
    sample: { packageName: 'com.tencent.mm' }
  },
  {
    name: 'action-find-and-tap',
    label: 'OCR 文字定位',
    description:
      '【首选交互方式，能覆盖绝大多数文字交互】先截图做 OCR，按 matchType 匹配 targetText，再对命中文字的中心坐标执行 action。一个动作即可完成 点击/双击/长按/输入/断言（action 字段切换），跨分辨率稳定、无需手填坐标。凡是目标带可见文字，都应优先用它，而不是 action-tap/action-input-text 等坐标动作。',
    category: 'canvas',
    params: {
      targetText: { type: 'string', required: true, description: '要查找的屏幕文字' },
      matchType: {
        type: 'string',
        default: 'contains',
        enum: ['contains', 'equals', 'startsWith', 'endsWith', 'regex'],
        description: '文字匹配方式'
      },
      action: {
        type: 'string',
        default: 'tap',
        enum: ['tap', 'doubleTap', 'longPress', 'input', 'assert'],
        description: '找到后执行的操作；assert 仅校验文字是否存在'
      },
      text: { type: 'string', description: 'action=input 时要输入的内容，支持 {{var}} 模板' },
      saveToVar: { type: 'string', description: '可选，把命中坐标 "x,y" 存入变量' },
      saveTextToVar: { type: 'string', description: '可选，把命中文字存入变量' }
    },
    sample: { targetText: '我的', matchType: 'contains', action: 'tap' }
  },
  {
    name: 'action-tap',
    label: '点击',
    description:
      '点击绝对坐标。坐标必须来自 get_ocr_result 或 get_ui_hierarchy 的真实观察，严禁凭常识臆测。有文字的目标优先用 action-find-and-tap，无文字图标先 get_ui_hierarchy 取 bounds 中心。',
    category: 'canvas',
    params: {
      x: { type: 'number', required: true, description: 'X 坐标（屏幕像素，须来自感知工具）' },
      y: { type: 'number', required: true, description: 'Y 坐标（屏幕像素，须来自感知工具）' }
    },
    sample: { x: 540, y: 1200 }
  },
  {
    name: 'action-double-tap',
    label: '双击',
    description: '双击绝对坐标。',
    category: 'canvas',
    params: {
      x: { type: 'number', required: true, description: 'X 坐标' },
      y: { type: 'number', required: true, description: 'Y 坐标' }
    },
    sample: { x: 540, y: 1200 }
  },
  {
    name: 'action-long-click',
    label: '长按',
    description: '长按绝对坐标。',
    category: 'canvas',
    params: {
      x: { type: 'number', required: true, description: 'X 坐标' },
      y: { type: 'number', required: true, description: 'Y 坐标' },
      duration: { type: 'number', default: 2000, description: '长按时长（毫秒）' }
    },
    sample: { x: 540, y: 1200, duration: 1500 }
  },
  {
    name: 'action-swipe',
    label: '滑动',
    description: '从 (x1,y1) 滑动到 (x2,y2)。用于翻页、下拉等手势。',
    category: 'canvas',
    params: {
      x1: { type: 'number', required: true, description: '起点 X' },
      y1: { type: 'number', required: true, description: '起点 Y' },
      x2: { type: 'number', required: true, description: '终点 X' },
      y2: { type: 'number', required: true, description: '终点 Y' },
      duration: { type: 'number', default: 300, description: '滑动时长（毫秒）' }
    },
    sample: { x1: 540, y1: 1600, x2: 540, y2: 600, duration: 300 }
  },
  {
    name: 'action-drag',
    label: '拖拽',
    description: '从 (x1,y1) 拖拽到 (x2,y2)，比滑动慢，用于拖动元素。',
    category: 'canvas',
    params: {
      x1: { type: 'number', required: true, description: '起点 X' },
      y1: { type: 'number', required: true, description: '起点 Y' },
      x2: { type: 'number', required: true, description: '终点 X' },
      y2: { type: 'number', required: true, description: '终点 Y' },
      duration: { type: 'number', default: 500, description: '拖拽时长（毫秒）' }
    },
    sample: { x1: 300, y1: 800, x2: 700, y2: 800, duration: 500 }
  },
  {
    name: 'action-input-text',
    label: '输入文字',
    description:
      '向输入框输入文字（会先点击 (x,y) 聚焦输入框）。坐标必填，须来自 get_ocr_result/get_ui_hierarchy 的真实观察（输入框中心）。支持 {{var}} 模板。',
    category: 'canvas',
    params: {
      text: { type: 'string', required: true, description: '要输入的文字' },
      x: { type: 'number', required: true, description: '输入框 X 坐标（须来自感知工具）' },
      y: { type: 'number', required: true, description: '输入框 Y 坐标（须来自感知工具）' }
    },
    sample: { text: '你好', x: 540, y: 960 }
  },
  {
    name: 'action-clear-text',
    label: '清除文字',
    description: '清除当前输入框文字（连续删除）。',
    category: 'canvas',
    params: {
      length: { type: 'number', default: 100, description: '最大删除字符数' }
    },
    sample: { length: 50 }
  },
  {
    name: 'action-key-event',
    label: '按键事件',
    description:
      '发送系统按键。keyCode：Android 4=返回 3=主屏 187=最近任务 66=回车 67=删除；鸿蒙 2=返回 1=主屏 3=最近任务。',
    category: 'canvas',
    params: {
      keyCode: { type: 'number', required: true, default: 4, description: '按键码（见说明）' }
    },
    sample: { keyCode: 3 }
  },
  {
    name: 'action-screenshot',
    label: '截图',
    description: '截取当前屏幕，可选把 base64 存入变量。',
    category: 'canvas',
    params: {
      saveToVar: { type: 'string', description: '可选，把截图 base64 存入变量' }
    },
    sample: {}
  },
  {
    name: 'action-shell',
    label: 'Shell 命令',
    description: '在设备上执行 shell 命令，可选把输出存入变量。支持 {{var}} 模板。',
    category: 'canvas',
    params: {
      command: { type: 'string', required: true, description: 'shell 命令' },
      saveToVar: { type: 'string', description: '可选，把命令输出存入变量' }
    },
    sample: { command: 'getprop ro.product.model' }
  },
  {
    name: 'action-get-var',
    label: '读取变量',
    description: '读取全局变量值，存入运行时上下文变量。',
    category: 'canvas',
    params: {
      key: { type: 'string', required: true, description: '全局变量键名' },
      saveToVar: { type: 'string', required: true, description: '存入的上下文变量名' }
    },
    sample: { key: 'token', saveToVar: 'token' }
  },
  {
    name: 'action-set-var',
    label: '写入变量',
    description: '设置全局变量，value 支持 {{var}} 模板引用。',
    category: 'canvas',
    params: {
      key: { type: 'string', required: true, description: '全局变量键名' },
      value: { type: 'string', required: true, description: '值，支持 {{var}} 模板' }
    },
    sample: { key: 'count', value: '1' }
  },
  {
    name: 'control-if',
    label: '条件判断',
    description: 'JS 条件表达式分支，表达式中可用 ctx.变量名 引用上下文变量。',
    category: 'canvas',
    params: {
      condition: { type: 'string', required: true, description: "JS 表达式，如 ctx.result === 'ok'" }
    },
    sample: { condition: "ctx.result === 'ok'" }
  },
  {
    name: 'control-loop',
    label: '循环',
    description: '对循环体重复执行 count 次。',
    category: 'canvas',
    params: {
      count: { type: 'number', required: true, description: '循环次数' }
    },
    sample: { count: 3 }
  },
  {
    name: 'control-delay',
    label: '延迟等待',
    description: '等待指定毫秒数，常用于等待页面加载。',
    category: 'canvas',
    params: {
      ms: { type: 'number', required: true, description: '等待毫秒数' }
    },
    sample: { ms: 5000 }
  }
]

// ── 设备感知动作（实机交互模式下可用，不写入画布）─────────────────────────

export const PERCEPTION_ACTIONS: ActionDef[] = [
  {
    name: 'get_device_screenshot',
    label: '截屏',
    description:
      '抓取当前选中设备屏幕截图。不知道按钮坐标、或需校验上一步动作结果时调用。配合 get_ocr_result 解析坐标。',
    category: 'perception',
    params: {},
    requiresDevice: true
  },
  {
    name: 'get_ocr_result',
    label: 'OCR 识别',
    description:
      '截图并做 OCR，返回每个文字区块的文字与中心坐标 (cx, cy)。需要定位具体文字坐标时使用，结果可直接用于 action-tap 坐标或 action-find-and-tap 的 targetText。',
    category: 'perception',
    params: {},
    requiresDevice: true
  },
  {
    name: 'get_ui_hierarchy',
    label: 'UI 层级',
    description: '抓取当前设备的 UI 控件层级（XML/JSON），用于分析复杂布局、定位特定文本控件。',
    category: 'perception',
    params: {},
    requiresDevice: true
  },
  {
    name: 'get_installed_apps',
    label: '已装应用',
    description:
      '获取设备已安装应用（包名+应用名），用于确认目标应用的 packageName。默认仅第三方应用，includeSystem=true 含系统应用。',
    category: 'perception',
    params: {
      includeSystem: { type: 'boolean', default: false, description: '是否包含系统应用' }
    },
    requiresDevice: true
  },
  {
    name: 'run_live_action',
    label: '实机试运行',
    description:
      '在真实设备上即时运行一个动作（点击/滑动/输入/等待等），用于在写入画布前验证操作是否正确。',
    category: 'perception',
    params: {
      actionType: {
        type: 'string',
        required: true,
        enum: [
          'action-launch-app',
          'action-close-app',
          'action-tap',
          'action-double-tap',
          'action-long-click',
          'action-swipe',
          'action-drag',
          'action-input-text',
          'action-clear-text',
          'action-key-event',
          'control-delay'
        ],
        description: '要试运行的动作类型'
      },
      params: { type: 'object', required: true, description: '该动作对应的参数对象' }
    },
    requiresDevice: true
  }
]

export const ALL_ACTIONS: ActionDef[] = [...CANVAS_ACTIONS, ...PERCEPTION_ACTIONS]

const ACTION_BY_NAME = new Map<string, ActionDef>(ALL_ACTIONS.map((a) => [a.name, a]))

export function getActionDef(name: string): ActionDef | undefined {
  return ACTION_BY_NAME.get(name)
}

// ── 元动作（不碰设备：技能加载、画布管理、批量节点）─────────────────────────
// 单独成表，避免在 tool-runtime 里散落 if 特例；它们不进 canvas/perception 清单。

export const META_ACTIONS: ActionDef[] = [
  {
    name: 'load_skill',
    label: '加载技能',
    description: '加载一个技能，获取该任务的详细操作经验与步骤指南。任务匹配某技能时先加载再动手。',
    category: 'meta',
    params: {
      name: { type: 'string', required: true, description: '要加载的技能 name（见「可用技能」清单）' }
    },
    sample: { name: 'app-launch-and-verify' }
  },
  {
    name: 'add_workflow_nodes',
    label: '批量添加节点',
    description: '一次性往画布追加多个节点。steps 为节点数组，每项含 type/label/params。',
    category: 'meta',
    params: {
      steps: { type: 'array', required: true, description: '节点数组，每项 { type, label, params }' }
    }
  },
  {
    name: 'clear_workflow_canvas',
    label: '清空画布',
    description: '清空画布上除触发器外的全部节点，重置为首个触发器节点。',
    category: 'meta',
    params: {}
  },
  {
    name: 'remove_last_nodes',
    label: '回退删除节点',
    description:
      '删除本轮自己最近追加的 count 个画布节点（默认 1）。当校验发现上一步操作没达到预期、定位错了时，先删掉错误节点再重新规划，避免画布堆积无效步骤。只能删自己本轮加的节点，不会动触发器或用户已有节点。',
    category: 'meta',
    params: {
      count: { type: 'number', default: 1, description: '要回退删除的节点数，默认 1' }
    },
    sample: { count: 1 }
  }
]

const META_BY_NAME = new Map<string, ActionDef>(META_ACTIONS.map((a) => [a.name, a]))

export function getMetaActionDef(name: string): ActionDef | undefined {
  return META_BY_NAME.get(name)
}

/** 返回动作分类（canvas/perception/meta），未知动作返回 undefined。供 UI 区分展示。 */
export function getActionCategory(name: string): ActionCategory | undefined {
  return (ACTION_BY_NAME.get(name) ?? META_BY_NAME.get(name))?.category
}

// ── 参数校验（零依赖，替代 zod）───────────────────────────────────────────

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

function checkType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'array':
      return Array.isArray(value)
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value)
    default:
      return true
  }
}

/** 按 ActionDef.params 校验必填/类型/枚举。缺失的可选字段忽略。 */
export function validateParams(def: ActionDef, raw: Record<string, unknown>): ValidationResult {
  const errors: string[] = []
  const params = raw ?? {}

  for (const [key, field] of Object.entries(def.params)) {
    const value = params[key]
    const missing = value === undefined || value === null
    if (missing) {
      if (field.required && field.default === undefined) {
        errors.push(`缺少必填参数 "${key}"`)
      }
      continue
    }
    if (!checkType(value, field.type)) {
      errors.push(`参数 "${key}" 类型应为 ${field.type}`)
      continue
    }
    if (field.enum && typeof value === 'string' && !field.enum.includes(value)) {
      errors.push(`参数 "${key}" 取值应为 [${field.enum.join(', ')}] 之一`)
    }
  }

  return { ok: errors.length === 0, errors }
}
