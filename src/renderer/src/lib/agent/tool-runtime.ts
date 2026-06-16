/**
 * 工具执行运行时 —— 由 ai-agent-panel 内联 executeTool 抽离
 *
 *  - 不依赖 React，所有外部能力通过 ToolRuntimeDeps 注入
 *  - canvas 类动作：实机模式+已连设备 → 在真机执行（成功才落画布）；静态模式 → 仅落画布
 *  - perception 类动作 → 调设备/OCR/后端
 *  - 返回 ToolResult：result 序列化后喂回模型，screenshot 仅供 UI 渲染
 */
import type { PlannedAction, ToolResult } from './types'
import type { WorkflowNode } from '../../../../shared/workflow'
import { getActionDef, getMetaActionDef, validateParams } from './action-space'
import { getSkill } from './skills'
import { cleanUiHierarchy, formatHierarchyForModel } from './ui-hierarchy'

/** 注入的外部依赖（由 panel 提供真实实现） */
export interface ToolRuntimeDeps {
  /** 当前选中设备 id，未连接为 null */
  getDeviceId: () => string | null
  /** 是否开启实机交互 */
  isInteractive: () => boolean
  /** 后端 baseUrl（OCR 等） */
  getBaseUrl: () => string
  /** 向画布追加一个节点 */
  appendNode: (step: { type: string; label: string; params: Record<string, unknown> }) => void
  /** 删除本轮 Agent 最近追加的 count 个节点（自愈回退），返回实际删除数 */
  removeLastNodes: (count: number) => number
  /** 清空并重置画布 */
  clearCanvas: () => void
  /** 查询某技能本次会话是否已加载过（防重复灌入正文），由 loop/hook 维护 */
  isSkillLoaded?: (name: string) => boolean
  /** 标记某技能已加载，由 loop/hook 维护 */
  markSkillLoaded?: (name: string) => void
}

/** runNode 即发即忘的 IPC 包成 Promise 后的结果 */
interface NodeRunResult {
  ok: boolean
  output?: string
  imageData?: string
  error?: string
}

/** 单个设备动作的执行超时（毫秒）。超时后兜底失败，避免 Agent loop 挂死。 */
const DEVICE_ACTION_TIMEOUT_MS = 30000

const PERCEPTION_TOOLS = new Set([
  'get_device_screenshot',
  'get_ui_hierarchy',
  'run_live_action',
  'get_ocr_result',
  'get_installed_apps'
])

export class ToolRuntime {
  constructor(private readonly deps: ToolRuntimeDeps) {}

  async execute(action: PlannedAction, signal?: AbortSignal): Promise<ToolResult> {
    const { type, param } = action

    // 1. 元动作（技能加载 / 画布管理 / 批量节点）——统一走 META_ACTIONS 校验 + 分发
    const metaDef = getMetaActionDef(type)
    if (metaDef) {
      const v = validateParams(metaDef, param)
      if (!v.ok) return { result: { error: `参数校验失败: ${v.errors.join('; ')}` } }
      switch (type) {
        case 'load_skill':
          return this.handleLoadSkill(param)
        case 'add_workflow_nodes':
          return this.handleAddNodes(param, signal)
        case 'clear_workflow_canvas':
          this.deps.clearCanvas()
          return { result: { success: true, message: '画布已清空并重置为触发器节点。' } }
        case 'remove_last_nodes': {
          const count = typeof param.count === 'number' && param.count > 0 ? Math.floor(param.count) : 1
          const removed = this.deps.removeLastNodes(count)
          if (removed === 0) {
            return { result: { error: '没有可回退的节点（本轮尚未追加过节点，或已回退到触发器）。' } }
          }
          return {
            result: { success: true, removed, message: `已回退删除最近 ${removed} 个节点，请重新规划。` }
          }
        }
      }
    }

    const def = getActionDef(type)
    if (!def) {
      return { result: { error: `未定义的动作类型: ${type}` } }
    }

    // 2. 参数校验
    const validation = validateParams(def, param)
    if (!validation.ok) {
      return { result: { error: `参数校验失败: ${validation.errors.join('; ')}` } }
    }

    // 3. 感知类动作的前置检查
    if (PERCEPTION_TOOLS.has(type)) {
      if (!this.deps.isInteractive()) {
        return {
          result: {
            error: `动作 [${type}] 被拦截：用户未开启"实机交互模式"。请直接规划画布动作（如 action-find-and-tap）。`
          }
        }
      }
      if (!this.deps.getDeviceId()) {
        return {
          result: {
            error: `动作 [${type}] 无法执行：当前未连接/选中设备。请退回静态规划或提示用户连接设备。`
          }
        }
      }
    }

    // 4. 分发
    switch (type) {
      case 'get_device_screenshot':
        return this.handleScreenshot()
      case 'get_ui_hierarchy':
        return this.handleUiHierarchy()
      case 'get_ocr_result':
        return this.handleOcr()
      case 'get_installed_apps':
        return this.handleInstalledApps(param)
      case 'run_live_action':
        return this.handleLiveAction(param, signal)
      default:
        // canvas 类动作
        return this.handleCanvasAction(def.name, def.label, param, signal)
    }
  }

  // ── 技能加载（渐进式披露）──────────────────────────────────────────────────

  private handleLoadSkill(param: Record<string, unknown>): ToolResult {
    const name = typeof param.name === 'string' ? param.name : ''
    if (!name) {
      return { result: { error: 'load_skill 缺少参数 name' } }
    }
    const skill = getSkill(name)
    if (!skill) {
      return { result: { error: `未找到技能 "${name}"，请从系统提示词的「可用技能」清单中选择正确的 name。` } }
    }
    // 防重复加载：本次会话已加载过，只提示不再灌入完整正文，省 token
    if (this.deps.isSkillLoaded?.(name)) {
      return {
        result: {
          success: true,
          skill: name,
          message: `技能 [${name}] 本次会话已加载过，请直接参照之前的指南执行，无需重复加载。`
        }
      }
    }
    this.deps.markSkillLoaded?.(name)
    return {
      result: {
        success: true,
        skill: name,
        instructions: skill.instructions,
        message: `已加载技能 [${name}]，请按以下指南执行。`
      }
    }
  }

  // ── 设备执行：把即发即忘的 runNode IPC 包成 Promise ────────────────────────

  private runNodeOnDevice(node: WorkflowNode, signal?: AbortSignal): Promise<NodeRunResult> {
    const deviceId = this.deps.getDeviceId()
    return new Promise<NodeRunResult>((resolve) => {
      let settled = false
      let lastLog: { output?: string; imageData?: string } | undefined
      let timer: ReturnType<typeof setTimeout> | undefined

      const finish = (r: NodeRunResult): void => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        offLog()
        offDone()
        resolve(r)
      }

      // 用户中断：通知主进程停止，并兜底失败返回
      const onAbort = (): void => {
        window.api.workflow.stop()
        finish({ ok: false, error: '已被用户中断' })
      }
      if (signal) {
        if (signal.aborted) {
          // 已中断，直接返回，不再下发动作
          window.api.workflow.stop()
          return resolve({ ok: false, error: '已被用户中断' })
        }
        signal.addEventListener('abort', onAbort)
      }

      // 超时兜底：避免设备无响应导致 Agent loop 永久挂死
      timer = setTimeout(() => {
        window.api.workflow.stop()
        finish({ ok: false, error: `设备动作执行超时（${DEVICE_ACTION_TIMEOUT_MS / 1000}s 无响应）` })
      }, DEVICE_ACTION_TIMEOUT_MS)

      const offLog = window.api.workflow.onLog((log) => {
        if (log.nodeId === node.id) lastLog = { output: log.output, imageData: log.imageData }
      })
      const offDone = window.api.workflow.onDone((res) => {
        if (res.status === 'done') {
          finish({ ok: true, output: lastLog?.output, imageData: lastLog?.imageData })
        } else {
          finish({ ok: false, error: res.error || lastLog?.output })
        }
      })

      window.api.workflow
        .runNode({ node, deviceId: deviceId ?? undefined, baseUrl: this.deps.getBaseUrl() })
        .then((res) => {
          // runNode 立即返回；ok=false 表示根本没启动（如已有任务在跑）
          if (!res.ok) finish({ ok: false, error: res.error })
        })
        .catch((e) => finish({ ok: false, error: e instanceof Error ? e.message : String(e) }))
    })
  }

  // ── canvas ──────────────────────────────────────────────────────────────

  private async handleCanvasAction(
    type: string,
    label: string,
    param: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<ToolResult> {
    const live = this.deps.isInteractive() && !!this.deps.getDeviceId()

    // 静态模式：仅把节点画到画布上
    if (!live) {
      this.deps.appendNode({ type, label, params: param })
      return { result: { success: true, message: `已往画布追加节点 [${label}]。` } }
    }

    // 实机模式：先在真机执行，成功才落画布（失败把真实错误喂回模型自愈）
    const node: WorkflowNode = {
      id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: type as WorkflowNode['type'],
      label,
      params: param as WorkflowNode['params'],
      position: { x: 0, y: 0 }
    }
    const run = await this.runNodeOnDevice(node, signal)

    if (!run.ok) {
      return {
        result: { error: `动作 [${label}] 在设备上执行失败：${run.error || '未知错误'}。该节点未加入画布。` }
      }
    }

    this.deps.appendNode({ type, label, params: param })
    return {
      result: { success: true, message: `已在设备执行 [${label}] 并加入画布：${run.output ?? ''}` },
      ...(run.imageData ? { screenshot: run.imageData } : {})
    }
  }

  private async handleAddNodes(
    param: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<ToolResult> {
    const steps = param.steps
    if (!Array.isArray(steps)) {
      return { result: { error: '参数 steps 缺失或不是数组' } }
    }
    // 逐个走 canvas 执行逻辑（实机模式会真执行）
    const results: string[] = []
    for (const step of steps) {
      const def = getActionDef(step?.type)
      const label = step.label || def?.label || step.type
      const r = await this.handleCanvasAction(step.type, label, step.params || {}, signal)
      const err = (r.result as { error?: string }).error
      if (err) {
        return { result: { error: `第 ${results.length + 1} 个节点失败：${err}` } }
      }
      results.push(label)
    }
    return {
      result: { success: true, count: results.length, message: `已处理 ${results.length} 个节点：${results.join(' → ')}` }
    }
  }

  // ── perception ────────────────────────────────────────────────────────────

  private async handleScreenshot(): Promise<ToolResult> {
    const deviceId = this.deps.getDeviceId()!
    const res = await window.api.screencap.capture(deviceId)
    if (!res.ok) return { result: { error: `截屏失败: ${res.error}` } }
    return {
      result: {
        success: true,
        mimeType: res.mimeType,
        message: '截图成功。请结合多模态视觉与 OCR 数据解析元素坐标。'
      },
      screenshot: `data:${res.mimeType};base64,${res.data}`
    }
  }

  private async handleUiHierarchy(): Promise<ToolResult> {
    const deviceId = this.deps.getDeviceId()!
    const res = await window.api.devices.dumpLayout(deviceId)
    if (!res.ok) return { result: { error: `抓取 UI 层级失败: ${res.error}` } }
    // 清洗：把数十 KB 的原始 XML/JSON 压成「有文字/可点击控件 + 中心坐标」的精简列表
    const cleaned = cleanUiHierarchy(res.data || '')
    return {
      result: {
        success: true,
        uiLayout: formatHierarchyForModel(cleaned),
        nodeCount: cleaned.items.length
      }
    }
  }

  private async handleOcr(): Promise<ToolResult> {
    const deviceId = this.deps.getDeviceId()!
    const capRes = await window.api.screencap.capture(deviceId)
    if (!capRes.ok) return { result: { error: `截屏失败: ${capRes.error}` } }
    const screenshot = `data:${capRes.mimeType};base64,${capRes.data}`
    const baseUrl = this.deps.getBaseUrl()

    // 并行：OCR 文字识别 + 通用元素检测（同一张截图，同一像素坐标系）
    const [ocrItems, elements] = await Promise.all([
      this.runOcr(baseUrl, capRes.data),
      this.runElementDetection(baseUrl, capRes.data, capRes.mimeType)
    ])

    return {
      result: {
        success: true,
        message: `感知结果：OCR 文字 ${ocrItems.length} 个、检测元素 ${elements.length} 个（cx/cy 均为中心坐标，可直接用于 action-tap）。文字交互优先用 action-find-and-tap；无文字图标用下方 elements 的坐标。`,
        textItems: ocrItems,
        elements
      },
      screenshot
    }
  }

  /** 调后端 OCR，返回文字区块中心坐标 */
  private async runOcr(
    baseUrl: string,
    imageBase64: string
  ): Promise<{ text: string; cx: number; cy: number }[]> {
    try {
      const res = await fetch(`${baseUrl}/api/v1/ocr/base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64, use_cls: true, use_det: true, use_rec: true }),
        signal: AbortSignal.timeout(20000)
      })
      const json = await res.json()
      const items: { text: string; box: number[][] }[] = json.data ?? []
      return items.map((it) => {
        const xs = it.box.map((p) => p[0])
        const ys = it.box.map((p) => p[1])
        return {
          text: it.text,
          cx: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
          cy: Math.round((Math.min(...ys) + Math.max(...ys)) / 2)
        }
      })
    } catch {
      return []
    }
  }

  /**
   * 调通用元素检测接口（YOLO 类）。截图里的图标/按钮等视觉元素，
   * 返回类别名 + 包围盒中心坐标，补 OCR 抓不到的无文字图标。
   * 接口：POST /api/v1/detection/detect/element（multipart file），
   * 响应 detections[].{ bbox:{x1,y1,x2,y2}, score, class_name }。
   */
  private async runElementDetection(
    baseUrl: string,
    imageBase64: string,
    mimeType: string
  ): Promise<{ label: string; score: number; cx: number; cy: number; box: number[] }[]> {
    try {
      const binary = atob(imageBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const form = new FormData()
      form.append('file', new Blob([bytes], { type: mimeType }), 'screen.png')

      const res = await fetch(
        `${baseUrl}/api/v1/detection/detect/element?conf_thres=0.3&iou_thres=0.5&input_size=800`,
        { method: 'POST', body: form, signal: AbortSignal.timeout(20000) }
      )
      if (!res.ok) return []
      const json = await res.json()
      const dets: {
        bbox: { x1: number; y1: number; x2: number; y2: number }
        score: number
        class_name: string
      }[] = json.detections ?? []
      return dets.map((d) => ({
        label: d.class_name,
        score: Math.round(d.score * 100) / 100,
        cx: Math.round((d.bbox.x1 + d.bbox.x2) / 2),
        cy: Math.round((d.bbox.y1 + d.bbox.y2) / 2),
        box: [Math.round(d.bbox.x1), Math.round(d.bbox.y1), Math.round(d.bbox.x2), Math.round(d.bbox.y2)]
      }))
    } catch {
      return []
    }
  }

  private async handleInstalledApps(param: Record<string, unknown>): Promise<ToolResult> {
    const deviceId = this.deps.getDeviceId()!
    const includeSystem = param.includeSystem === true
    const res = await window.api.apps.list(deviceId, { includeSystem })
    if (!res.ok) return { result: { error: `获取应用列表失败: ${res.error}` } }
    const apps = res.apps.map((a) => ({ packageName: a.packageName, name: a.name }))
    return { result: { success: true, count: apps.length, apps } }
  }

  private async handleLiveAction(
    param: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<ToolResult> {
    const actionType = String(param.actionType)
    const actionParams = (param.params as Record<string, unknown>) || {}
    const node: WorkflowNode = {
      id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: actionType as WorkflowNode['type'],
      label: `实机测试-${actionType}`,
      params: actionParams as WorkflowNode['params'],
      position: { x: 0, y: 0 }
    }
    const run = await this.runNodeOnDevice(node, signal)
    if (!run.ok) {
      return { result: { error: `实机试运行失败: ${run.error || '未知错误'}` } }
    }
    return {
      result: { success: true, info: `实机动作 [${actionType}] 已成功试运行：${run.output ?? ''}` },
      ...(run.imageData ? { screenshot: run.imageData } : {})
    }
  }
}
