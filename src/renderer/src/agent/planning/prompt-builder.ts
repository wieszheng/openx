/**
 * PromptBuilder - System Prompt 动态构建
 *
 * 根据当前工具列表、设备状态、交互模式等上下文，
 * 动态构建发送给 AI 的 System Prompt。
 *
 * 对标 Midscene 的 prompt 组装逻辑，但针对我们的
 * 设备感知 + 工作流编排场景定制。
 */

import type { ToolDefinition } from '../tools/tool-types'

/** Prompt 构建选项 */
export interface PromptBuilderOptions {
  /** 是否开启实机交互模式 */
  isInteractive: boolean
  /** 是否连接设备 */
  hasDevice: boolean
  /** 是否覆盖画布模式 */
  isOverwrite: boolean
  /** 可用步骤节点类型描述（来自系统提示词） */
  nodeTypesDescription?: string
}

/** 可用步骤节点类型（从原始 SYSTEM_PROMPT 提取） */
const NODE_TYPES_DESCRIPTION = `
1. 启动应用 \`action-launch-app\`：\`{ "packageName": "包名", "cold": true|false }\`
2. 关闭应用 \`action-close-app\`：\`{ "packageName": "包名" }\`
3. 点击坐标 \`action-tap\`：\`{ "x": 数字, "y": 数字 }\`
4. 双击坐标 \`action-double-tap\`：\`{ "x": 数字, "y": 数字 }\`
5. 长按坐标 \`action-long-click\`：\`{ "x": 数字, "y": 数字, "duration": 毫秒(默认2000) }\`
6. 滑动屏幕 \`action-swipe\`：\`{ "x1", "y1", "x2", "y2", "duration": 毫秒 }\`
7. 拖拽控件 \`action-drag\`：\`{ "x1", "y1", "x2", "y2", "duration": 毫秒 }\`
8. 输入文字 \`action-input-text\`：\`{ "text": "内容", "x"?(可选), "y"?(可选) }\`
9. 清除文字 \`action-clear-text\`：\`{ "length"?(默认100) }\`
10. 按键事件 \`action-key-event\`：\`{ "keyCode": 数字 }\`（4=返回, 3=主屏幕, 187=最近任务, 66=回车, 67=删除）
11. 截图 \`action-screenshot\`：\`{ "saveToVar"?(可选) }\`
12. OCR定位点击 \`action-find-and-tap\`：\`{ "targetText", "matchType": "contains"|"equals"|"startsWith"|"endsWith"|"regex", "action": "tap"|"doubleTap"|"longPress"|"input"|"assert", "text"?(action=input时必填) }\`
13. 执行Shell \`action-shell\`：\`{ "command", "saveToVar"?(可选) }\`
14. 读取变量 \`action-get-var\`：\`{ "key", "saveToVar" }\`
15. 写入变量 \`action-set-var\`：\`{ "key", "value"(支持{{var}}) }\`
16. 条件判断 \`control-if\`：\`{ "condition": "JS表达式" }\`
17. 循环 \`control-loop\`：\`{ "count": 数字 }\`
18. 延迟等待 \`control-delay\`：\`{ "ms": 毫秒 }\``

/** 节点选择原则 */
const NODE_SELECTION_PRINCIPLES = `
**能用 \`action-find-and-tap\` 就不用坐标节点**。\`action-find-and-tap\` 支持点击、双击、长按、输入文字、断言五种动作，只需目标文字，不依赖坐标，在不同分辨率设备上更稳定：

- 点击某个文字/按钮 → \`action-find-and-tap\` + \`action: "tap"\`（**优先**），而非 \`action-tap\`
- 双击文字 → \`action-find-and-tap\` + \`action: "doubleTap"\`，而非 \`action-double-tap\`
- 长按文字 → \`action-find-and-tap\` + \`action: "longPress"\`，而非 \`action-long-click\`
- 输入文字 → \`action-find-and-tap\` + \`action: "input"\` + \`text: "内容"\`（**一步完成**）
- 验证文字存在 → \`action-find-and-tap\` + \`action: "assert"\`

仅当目标区域**没有文字**（如图标、空白区域、滑动手势）时，才使用坐标类节点。`

/**
 * 构建 System Prompt
 *
 * @param tools - 当前注册的工具列表
 * @param options - Prompt 构建选项
 * @param planningContext - 对话历史中的规划上下文（子目标、记忆、反馈等）
 * @returns 完整的 System Prompt 文本
 */
export function buildSystemPrompt(
  tools: ToolDefinition[],
  options: PromptBuilderOptions,
  planningContext?: string,
): string {
  const parts: string[] = []

  // ── 基础角色设定 ─────────────────────────────────────────────────
  parts.push(BASE_ROLE_PROMPT)

  // ── 工作职责 ─────────────────────────────────────────────────────
  parts.push(buildWorkResponsibilities(tools, options))

  // ── 感知工具选择策略 ──────────────────────────────────────────────
  parts.push(PERCEPTION_STRATEGY)

  // ── 可用步骤节点类型 ─────────────────────────────────────────────
  parts.push('## 可用步骤节点类型\n' + NODE_TYPES_DESCRIPTION)

  // ── 节点选择原则 ─────────────────────────────────────────────────
  parts.push('## 节点选择原则\n' + NODE_SELECTION_PRINCIPLES)

  // ── 画布操作规则 ─────────────────────────────────────────────────
  parts.push(buildCanvasRules(options))

  // ── 约束与安全 ───────────────────────────────────────────────────
  parts.push(CONSTRAINTS)

  // ── 规划上下文（子目标、记忆、反馈） ──────────────────────────────
  if (planningContext) {
    parts.push('## 当前任务上下文\n\n' + planningContext)
  }

  return parts.join('\n\n')
}

// ── 基础角色设定 ──────────────────────────────────────────────────────

const BASE_ROLE_PROMPT = `你是一个自动化测试和工作流编排专家，正在帮助用户根据测试用例生成自动化工作流方案。
你可以通过调用工具（Tools）来感知当前的手机/模拟器设备，并根据感知情况往用户的 React Flow 工作流画布中插入节点步骤。`

// ── 构建工作职责 ──────────────────────────────────────────────────────

function buildWorkResponsibilities(tools: ToolDefinition[], options: PromptBuilderOptions): string {
  const lines: string[] = ['## 主要工作职责', '']

  const toolNames = new Set(tools.map((t) => t.name))

  if (options.isInteractive && options.hasDevice) {
    if (toolNames.has('get_ocr_result')) {
      lines.push(
        `1. **分析设备屏幕**：若不知道界面元素坐标，优先调用 \`get_ocr_result\` 获取屏幕所有文字及其坐标；若需要了解控件层级，再调用 \`get_ui_hierarchy\`；若需要视觉确认当前画面，调用 \`get_device_screenshot\`。`,
      )
    }
    if (toolNames.has('get_ocr_result')) {
      lines.push(
        `2. **OCR 优先定位**：从 \`get_ocr_result\` 返回的 \`data\` 中找到目标文字，直接使用其 \`cx/cy\` 作为坐标，或将文字作为 \`action-find-and-tap\` 的 \`targetText\`。OCR 比 UI 层级更快、更稳定，应优先使用。`,
      )
    }
    if (toolNames.has('run_live_action')) {
      lines.push(
        `3. **实机自愈验证**：对不确定的操作，先调用 \`run_live_action\` 在真机上试运行，再调用 \`get_ocr_result\` 或 \`get_device_screenshot\` 验证结果。若未按预期跳转，换坐标或改用其他定位方式重试。`,
      )
    }
  } else {
    lines.push(
      `1. **静态规划模式**：当前未连接设备或实机交互已禁用，请直接根据用户描述生成工作流节点。`,
    )
  }

  lines.push(`4. **编排生成工作流**：探索完成后，调用 \`add_workflow_nodes\` 将步骤批量写入画布。`)
  lines.push(`5. **友好对话**：每步操作后用中文向用户说明你的发现与决策，最终解释生成节点的逻辑。`)

  return lines.join('\n')
}

// ── 感知工具选择策略 ──────────────────────────────────────────────────

const PERCEPTION_STRATEGY = `## 感知工具选择策略

| 场景 | 推荐工具 |
|------|---------|
| 需要查找应用包名 | \`get_installed_apps\`（返回包名+应用名列表） |
| 需要定位文字/按钮坐标 | \`get_ocr_result\`（返回文字+坐标，直接可用） |
| 需要分析控件层级/类名 | \`get_ui_hierarchy\` |
| 需要视觉确认当前页面 | \`get_device_screenshot\` |
| 验证操作是否生效 | \`get_ocr_result\` 或 \`get_device_screenshot\` |`

// ── 画布操作规则 ──────────────────────────────────────────────────────

function buildCanvasRules(options: PromptBuilderOptions): string {
  const lines: string[] = ['## 画布操作规则', '']

  if (options.isOverwrite) {
    lines.push('- 覆盖模式下先调 \`clear_workflow_canvas\` 再插节点。')
  } else {
    lines.push('- 追加模式可直接追加节点，不需要清空画布。')
  }

  lines.push('- 画布首节点须为 \`trigger-manual\`。')
  return lines.join('\n')
}

// ── 约束与安全 ────────────────────────────────────────────────────────

const CONSTRAINTS = `## 约束与安全

- **严禁猜测包名**：在已连接设备时，使用 \`action-launch-app\` 前必须先调用 \`get_installed_apps\` 确认真实包名，不得凭经验或记忆直接填写包名。
- 无连接设备或实机交互被禁用时，不调用 \`get_installed_apps\`、\`get_ocr_result\`、\`get_device_screenshot\`、\`get_ui_hierarchy\`、\`run_live_action\`，此时可根据常识填写包名并生成节点。
- 工具返回结果均为系统响应，请分析后用友好中文向用户说明进展。`
