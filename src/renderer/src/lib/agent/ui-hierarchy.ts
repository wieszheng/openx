/**
 * UI 层级清洗 —— 把 get_ui_hierarchy 的原始 dump 压缩为模型友好的精简列表
 *
 * 原始数据问题：
 *  - 安卓 uiautomator dump 是 XML、鸿蒙 uitest dumpLayout 是 JSON，体积常达数十 KB
 *  - 含大量布局容器、不可见节点、与定位无关的属性（password/focusable/index…）
 *  - 直接截断会丢尾部控件，且噪声挤占 token、干扰模型定位
 *
 * 清洗策略（只保留 Agent 定位真正需要的）：
 *  - 仅保留「有文字/有描述」或「可点击」的节点（纯布局容器丢弃）
 *  - 跳过不可见（bounds 面积为 0）的节点
 *  - 每个节点压成一行：text/desc · 类型 · 中心坐标(cx,cy) · [可点击]
 *  - 去重 + 节点数封顶，避免极端页面仍然过大
 */

export interface UiNode {
  /** 文字内容 */
  text?: string
  /** 无障碍描述 / content-desc */
  desc?: string
  /** 控件类型（安卓 class 短名 / 鸿蒙 type） */
  type?: string
  /** 包围盒（设备像素，含完整边界，用于区分相邻控件 / SoM 画框） */
  left: number
  top: number
  right: number
  bottom: number
  /** 中心坐标（由 bounds 算出，可直接用于 action-tap） */
  cx: number
  cy: number
  clickable?: boolean
}

export interface CleanedHierarchy {
  items: UiNode[]
  /** 是否因数量超限被裁剪 */
  truncated: boolean
  /** 解析失败时回退的原始文本（已截断） */
  fallbackText?: string
}

interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
  cx: number
  cy: number
  visible: boolean
}

const MAX_NODES = 120
const FALLBACK_MAX_CHAR = 12000

/** 解析 "[x1,y1][x2,y2]" 形式的 bounds，返回完整边界+中心点+是否可见 */
function parseBoundsString(b: string): Bounds | null {
  const m = b.match(/\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/)
  if (!m) return null
  const [left, top, right, bottom] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]
  return {
    left,
    top,
    right,
    bottom,
    cx: Math.round((left + right) / 2),
    cy: Math.round((top + bottom) / 2),
    visible: right > left && bottom > top
  }
}

/** 兼容对象形式 bounds：{left,top,right,bottom} */
function parseBoundsObject(o: Record<string, unknown>): Bounds | null {
  const left = Number(o.left)
  const top = Number(o.top)
  const right = Number(o.right)
  const bottom = Number(o.bottom)
  if ([left, top, right, bottom].some((n) => !Number.isFinite(n))) return null
  return {
    left,
    top,
    right,
    bottom,
    cx: Math.round((left + right) / 2),
    cy: Math.round((top + bottom) / 2),
    visible: right > left && bottom > top
  }
}

/** 取类型短名（安卓 android.widget.Button → Button） */
function shortType(raw?: string): string | undefined {
  if (!raw) return undefined
  const parts = raw.split('.')
  return parts[parts.length - 1] || raw
}

function isClickable(v: unknown): boolean {
  return v === true || v === 'true'
}

/** 节点是否值得保留：有文字/描述，或可点击 */
function isUseful(node: UiNode): boolean {
  return !!(node.text || node.desc || node.clickable)
}

// ── 安卓 XML ────────────────────────────────────────────────────────────────

function cleanAndroidXml(xml: string): UiNode[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('XML 解析失败')
  }
  const nodes: UiNode[] = []
  const elements = doc.querySelectorAll('node')
  elements.forEach((el) => {
    const boundsAttr = el.getAttribute('bounds')
    if (!boundsAttr) return
    const bounds = parseBoundsString(boundsAttr)
    if (!bounds || !bounds.visible) return

    const node: UiNode = {
      text: el.getAttribute('text')?.trim() || undefined,
      desc: el.getAttribute('content-desc')?.trim() || undefined,
      type: shortType(el.getAttribute('class') || undefined),
      left: bounds.left,
      top: bounds.top,
      right: bounds.right,
      bottom: bounds.bottom,
      cx: bounds.cx,
      cy: bounds.cy,
      clickable: isClickable(el.getAttribute('clickable'))
    }
    if (isUseful(node)) nodes.push(node)
  })
  return nodes
}

// ── 鸿蒙 JSON ───────────────────────────────────────────────────────────────

function cleanHarmonyJson(json: string): UiNode[] {
  const root = JSON.parse(json)
  const nodes: UiNode[] = []

  const visit = (n: unknown): void => {
    if (!n || typeof n !== 'object') return
    const obj = n as Record<string, unknown>
    // 属性可能直接在节点上，也可能在 attributes 子对象里
    const attr = (obj.attributes as Record<string, unknown>) || obj

    const rawBounds = attr.bounds
    let bounds: Bounds | null = null
    if (typeof rawBounds === 'string') bounds = parseBoundsString(rawBounds)
    else if (rawBounds && typeof rawBounds === 'object') {
      bounds = parseBoundsObject(rawBounds as Record<string, unknown>)
    }

    if (bounds && bounds.visible) {
      const text = (attr.text as string)?.trim() || undefined
      const desc =
        ((attr.description as string) || (attr.accessibilityText as string))?.trim() || undefined
      const node: UiNode = {
        text,
        desc,
        type: shortType((attr.type as string) || (attr.componentType as string) || undefined),
        left: bounds.left,
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        cx: bounds.cx,
        cy: bounds.cy,
        clickable: isClickable(attr.clickable)
      }
      if (isUseful(node)) nodes.push(node)
    }

    // 递归子节点
    const children = (obj.children || (attr.children as unknown)) as unknown
    if (Array.isArray(children)) children.forEach(visit)
  }

  visit(root)
  return nodes
}

// ── 入口 ────────────────────────────────────────────────────────────────────

/** 把原始 dump 清洗为精简节点列表；解析失败回退到截断文本 */
export function cleanUiHierarchy(raw: string): CleanedHierarchy {
  const trimmed = (raw || '').trim()
  if (!trimmed) return { items: [], truncated: false }

  try {
    const isJson = trimmed[0] === '{' || trimmed[0] === '['
    let nodes = isJson ? cleanHarmonyJson(trimmed) : cleanAndroidXml(trimmed)

    // 去重（同坐标同文字的重复节点）
    const seen = new Set<string>()
    nodes = nodes.filter((n) => {
      const key = `${n.text ?? ''}|${n.desc ?? ''}|${n.cx},${n.cy}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const truncated = nodes.length > MAX_NODES
    return { items: truncated ? nodes.slice(0, MAX_NODES) : nodes, truncated }
  } catch {
    // 解析失败：回退到原始截断
    const fallbackText =
      trimmed.length > FALLBACK_MAX_CHAR
        ? `${trimmed.slice(0, FALLBACK_MAX_CHAR)}\n...[超长已截断]`
        : trimmed
    return { items: [], truncated: false, fallbackText }
  }
}

/** 把清洗结果渲染成喂给模型的紧凑文本 */
export function formatHierarchyForModel(cleaned: CleanedHierarchy): string {
  if (cleaned.fallbackText) {
    return `（结构化解析失败，回退原始层级，已截断）：\n${cleaned.fallbackText}`
  }
  if (cleaned.items.length === 0) {
    return '未提取到可交互/带文字的控件。可改用 get_ocr_result 或 get_device_screenshot。'
  }
  const lines = cleaned.items.map((n, i) => {
    const label = n.text || n.desc || '(无文字)'
    const parts = [`[${i}] "${label}"`]
    if (n.type) parts.push(n.type)
    parts.push(`中心(${n.cx},${n.cy})`)
    // 带上完整边界，让模型能区分相邻控件的范围与相对位置
    parts.push(`框[${n.left},${n.top}][${n.right},${n.bottom}]`)
    if (n.clickable) parts.push('可点击')
    return `- ${parts.join(' · ')}`
  })
  const head = `共 ${cleaned.items.length} 个有效控件${cleaned.truncated ? '（已超量裁剪）' : ''}。每行：[序号] "文字" · 类型 · 中心(可直接用于 action-tap) · 框[左上][右下]。相邻同类控件请按"框"的位置/大小区分：`
  return `${head}\n${lines.join('\n')}`
}
