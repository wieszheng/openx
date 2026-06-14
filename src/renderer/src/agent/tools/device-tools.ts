/**
 * 设备感知工具集
 *
 * 需要连接物理设备才能执行的工具：
 * - get_device_screenshot：截取设备屏幕
 * - get_ui_hierarchy：获取 UI 控件层级
 * - get_ocr_result：截图 + OCR 识别文字及坐标
 * - get_installed_apps：获取设备已安装应用列表
 */

import { defineTool } from './define-tool'
import type { ToolContext } from './tool-types'
import type { ToolResult } from '../core/types'

/** 截取设备屏幕截图 */
export const getDeviceScreenshotTool = defineTool({
  name: 'get_device_screenshot',
  description:
    '抓取当前选中 Android/HarmonyOS 物理或模拟器设备的屏幕截图（返回 base64）。当不知道按钮坐标或需校验动作结果时调用。',
  paramSchema: { type: 'object', properties: {} },
  requiresDevice: true,
  execute: async (_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
    const res = await window.api.screencap.capture(ctx.deviceId!)
    if (!res.ok) {
      return { success: false, error: `截屏失败: ${res.error}` }
    }
    const imgData = `data:${res.mimeType};base64,${res.data}`
    return {
      success: true,
      data: {
        mimeType: res.mimeType,
        message: '截图成功，请基于多模态大模型和OCR返回的排版数据，解析并确定元素相对坐标。',
      },
      screenshot: imgData,
    }
  },
})

/** 获取 UI 控件层级 XML */
export const getUiHierarchyTool = defineTool({
  name: 'get_ui_hierarchy',
  description:
    '读取当前选中设备的 UI 控件层级 XML/JSON 结构。用于寻找特定文本的控件以分析位置，配合截图使用。',
  paramSchema: { type: 'object', properties: {} },
  requiresDevice: true,
  execute: async (_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
    const res = await window.api.devices.dumpLayout(ctx.deviceId!)
    if (!res.ok) {
      return { success: false, error: `抓取屏幕 UI 结构失败: ${res.error}` }
    }
    const maxChar = 30000
    const rawXml = res.data || ''
    const truncated =
      rawXml.length > maxChar
        ? rawXml.slice(0, maxChar) + '\n...[truncated due to length]'
        : rawXml
    return { success: true, data: { uiLayoutDump: truncated } }
  },
})

/** 截图 + OCR 识别文字及坐标 */
export const getOcrResultTool = defineTool({
  name: 'get_ocr_result',
  description:
    '对当前设备屏幕进行截图并调用后端 OCR，返回每个文字区块的文字内容及中心坐标(cx, cy)。需要定位具体文字但不想依赖 UI 层级时使用，返回结果可直接用于 action-tap 的坐标或 action-find-and-tap 的 targetText。',
  paramSchema: { type: 'object', properties: {} },
  requiresDevice: true,
  execute: async (_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
    const capRes = await window.api.screencap.capture(ctx.deviceId!)
    if (!capRes.ok) {
      return { success: false, error: `截屏失败: ${capRes.error}` }
    }
    const imgData = `data:${capRes.mimeType};base64,${capRes.data}`

    let ocrItems: { text: string; box: number[][] }[] = []
    try {
      const ocrRes = await fetch(`${ctx.baseUrl}/api/v1/ocr/base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capRes.data,
          use_cls: true,
          use_det: true,
          use_rec: true,
        }),
        signal: ctx.signal,
      })
      const ocrJson = await ocrRes.json()
      ocrItems = ocrJson.data ?? []
    } catch (e: unknown) {
      return {
        success: false,
        error: `OCR 请求失败: ${e instanceof Error ? e.message : String(e)}`,
        screenshot: imgData,
      }
    }

    return {
      success: true,
      data: {
        message: `OCR 识别到 ${ocrItems.length} 个文字区块，数据如下（text: 文字, cx/cy: 中心坐标）：`,
        items: ocrItems.map((it) => {
          const xs = it.box.map((p) => p[0])
          const ys = it.box.map((p) => p[1])
          const cx = Math.round((Math.min(...xs) + Math.max(...xs)) / 2)
          const cy = Math.round((Math.min(...ys) + Math.max(...ys)) / 2)
          return { text: it.text, cx, cy }
        }),
      },
      screenshot: imgData,
    }
  },
})

/** 获取设备已安装应用列表 */
export const getInstalledAppsTool = defineTool({
  name: 'get_installed_apps',
  description:
    '获取当前设备已安装应用列表（包名+应用名），用于确认目标应用的 packageName。默认只返回第三方应用，可传 includeSystem=true 包含系统应用。',
  paramSchema: {
    type: 'object',
    properties: {
      includeSystem: {
        type: 'boolean',
        description: '是否包含系统应用，默认 false',
      },
    },
  },
  requiresDevice: true,
  execute: async (args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
    const includeSystem = args.includeSystem === true
    const res = await window.api.apps.list(ctx.deviceId!, { includeSystem })
    if (!res.ok) {
      return { success: false, error: `获取应用列表失败: ${res.error}` }
    }
    const apps = res.apps.map((a: any) => ({ packageName: a.packageName, label: a.label ?? '' }))
    return { success: true, data: { count: apps.length, apps } }
  },
})
