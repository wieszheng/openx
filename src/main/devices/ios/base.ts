/**
 * ios-device.ts
 * wdapy AppiumUSBClient 的 TypeScript 封装
 *
 * 环境要求：
 *   - Electron 主进程 或 Node.js 脚本
 *   - 已注册 registerIpcHandlers()（Electron 环境）
 *
 * 安装依赖：
 *   npm install electron   # 如果在 Electron 中使用
 *
 * 用法：
 *   import { IOSDevice } from './ios-device'
 *   const device = new IOSDevice('00008140-00191D962283801C')
 *   const buf = await device.screenshot()
 */

import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import { resolveIosDeviceExecutable } from '../toolkit-paths'

import type {
  ScreenshotResponse,
  ScreenshotSaveResponse,
  TapResponse,
  SwipeResponse,
  AppCurrentResponse,
  AppListResponse,
  DeviceInfoResponse,
  WindowSizeResponse,
  LockedResponse,
  ClipboardResponse,
  AlertExistsResponse,
  AlertButtonsResponse,
  FindResponse,
  FindQuery,
  SwipeDirection,
  OkResponse,
} from './types'

// ─────────────────────────────────────────────────────────
// 内部工具
// ─────────────────────────────────────────────────────────

interface PythonResult {
  ok: boolean
  error?: string
  [key: string]: unknown
}

function getBinInfo(): { bin: string; baseArgs: string[] } {
  const bundled = resolveIosDeviceExecutable()
  if (bundled) {
    return { bin: bundled, baseArgs: [] }
  }

  // 开发环境 / Node.js 脚本：直接运行 Python 源文件
  const py = process.platform === 'win32' ? 'python' : 'python3'
  const script = path.join(__dirname, 'ios_device.py')
  return { bin: py, baseArgs: [script] }
}

function run<T extends PythonResult>(udid: string, cmdArgs: string[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const { bin, baseArgs } = getBinInfo()
    const allArgs = [...baseArgs, udid, ...cmdArgs]

    const child: ChildProcess = spawn(bin, allArgs)
    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })

    child.on('error', (err: Error) => {
      reject(new Error(`启动 Python 进程失败: ${err.message}`))
    })

    child.on('close', () => {
      try {
        const result = JSON.parse(stdout.trim()) as T
        if (result.ok) {
          resolve(result)
        } else {
          reject(new Error(result.error ?? '未知错误'))
        }
      } catch {
        reject(new Error(stderr.trim() || `无法解析输出: ${stdout.slice(0, 300)}`))
      }
    })
  })
}

// ─────────────────────────────────────────────────────────
// IOSDevice 主类
// ─────────────────────────────────────────────────────────

export class IOSDevice {
  readonly udid: string

  /**
   * @param udid 设备 UDID（只连一台设备时可传空字符串 ''）
   */
  constructor(udid: string = '') {
    this.udid = udid
  }

  private run<T extends PythonResult>(cmdArgs: string[]): Promise<T> {
    return run<T>(this.udid, cmdArgs)
  }

  // ── 截图 ────────────────────────────────────────────────

  /**
   * 截图，返回 PNG Buffer
   * @example
   * const buf = await device.screenshot()
   * fs.writeFileSync('screen.png', buf)
   * // 或在 Electron 渲染进程中：
   * img.src = `data:image/png;base64,${buf.toString('base64')}`
   */
  async screenshot(): Promise<Buffer> {
    const res = await this.run<ScreenshotResponse>(['screenshot'])
    return Buffer.from(res.image, 'base64')
  }

  /**
   * 截图并保存到本地路径
   * @param savePath 保存路径，如 '/tmp/screen.png'
   */
  screenshotSave(savePath: string): Promise<ScreenshotSaveResponse> {
    return this.run<ScreenshotSaveResponse>(['screenshot', '--save', savePath])
  }

  /**
   * 截图并返回 base64 data URL，可直接赋值给 <img src>
   * @example
   * img.src = await device.screenshotDataUrl()
   */
  async screenshotDataUrl(): Promise<string> {
    const res = await this.run<ScreenshotResponse>(['screenshot'])
    return `data:image/png;base64,${res.image}`
  }

  // ── 手势 ────────────────────────────────────────────────

  /**
   * 点击坐标
   * @param x 逻辑点 x（不是像素）
   * @param y 逻辑点 y
   */
  tap(x: number, y: number): Promise<TapResponse> {
    return this.run<TapResponse>(['tap', String(x), String(y)])
  }

  /**
   * 双击坐标
   */
  doubleTap(x: number, y: number): Promise<TapResponse> {
    return this.run<TapResponse>(['double-tap', String(x), String(y)])
  }

  /**
   * 滑动（从一个点滑到另一个点）
   * @param duration 滑动时长（秒），默认 0.5
   */
  swipe(
    x1: number, y1: number,
    x2: number, y2: number,
    duration = 0.5,
  ): Promise<SwipeResponse> {
    return this.run<SwipeResponse>([
      'swipe',
      String(x1), String(y1),
      String(x2), String(y2),
      '--duration', String(duration),
    ])
  }

  /**
   * 按方向滑动屏幕（自动计算坐标）
   * @param direction 'up' | 'down' | 'left' | 'right'
   * @param distance 滑动距离（逻辑点），默认 400
   */
  async swipeDirection(direction: SwipeDirection, distance = 400): Promise<SwipeResponse> {
    const { width, height } = await this.windowSize()
    const cx = Math.round(width / 2)
    const cy = Math.round(height / 2)
    const half = Math.round(distance / 2)

    const coords: Record<SwipeDirection, [number, number, number, number]> = {
      up:    [cx, cy + half, cx, cy - half],
      down:  [cx, cy - half, cx, cy + half],
      left:  [cx + half, cy, cx - half, cy],
      right: [cx - half, cy, cx + half, cy],
    }

    const [x1, y1, x2, y2] = coords[direction]
    return this.swipe(x1, y1, x2, y2)
  }

  /**
   * 输入文本（需先 tap 聚焦输入框）
   */
  input(text: string): Promise<OkResponse> {
    return this.run<OkResponse>(['input', text])
  }

  // ── 系统操作 ─────────────────────────────────────────────

  /** 回到主屏幕 */
  home(): Promise<OkResponse> {
    return this.run<OkResponse>(['home'])
  }

  /** 锁屏 */
  lock(): Promise<OkResponse> {
    return this.run<OkResponse>(['lock'])
  }

  /** 解锁 */
  unlock(): Promise<OkResponse> {
    return this.run<OkResponse>(['unlock'])
  }

  /** 查询是否锁屏 */
  async isLocked(): Promise<boolean> {
    const res = await this.run<LockedResponse>(['locked'])
    return res.locked
  }

  // ── App 管理 ──────────────────────────────────────────────

  /** 启动 App */
  appStart(bundleId: string): Promise<OkResponse> {
    return this.run<OkResponse>(['app-start', bundleId])
  }

  /** 终止 App */
  appStop(bundleId: string): Promise<OkResponse> {
    return this.run<OkResponse>(['app-stop', bundleId])
  }

  /** 重启 App（先终止再启动） */
  async appRestart(bundleId: string): Promise<void> {
    await this.appStop(bundleId)
    await new Promise(r => setTimeout(r, 800))
    await this.appStart(bundleId)
  }

  /** 当前前台 App 信息 */
  appCurrent(): Promise<AppCurrentResponse> {
    return this.run<AppCurrentResponse>(['app-current'])
  }

  /** 已安装 App 列表 */
  appList(): Promise<AppListResponse> {
    return this.run<AppListResponse>(['app-list'])
  }

  // ── 设备信息 ──────────────────────────────────────────────

  /** 设备详细信息（含屏幕尺寸、缩放比） */
  deviceInfo(): Promise<DeviceInfoResponse> {
    return this.run<DeviceInfoResponse>(['device-info'])
  }

  /** 屏幕逻辑分辨率 */
  async windowSize(): Promise<{ width: number; height: number; scale: number }> {
    const res = await this.run<WindowSizeResponse>(['window-size'])
    return { width: res.width, height: res.height, scale: res.scale }
  }

  /** 屏幕中心坐标 */
  async screenCenter(): Promise<{ x: number; y: number }> {
    const { width, height } = await this.windowSize()
    return { x: Math.round(width / 2), y: Math.round(height / 2) }
  }

  // ── 工具 ──────────────────────────────────────────────────

  /** 用 Safari 打开 URL */
  openUrl(url: string): Promise<OkResponse> {
    return this.run<OkResponse>(['open-url', url])
  }

  /** 设置剪贴板文本（需 WDA app 在前台） */
  clipboardSet(text: string): Promise<OkResponse> {
    return this.run<OkResponse>(['clipboard-set', text])
  }

  /** 读取剪贴板文本 */
  async clipboardGet(): Promise<string> {
    const res = await this.run<ClipboardResponse>(['clipboard-get'])
    return res.text
  }

  /**
   * 弹窗操作
   * @example
   * const visible = await device.alertExists()
   * if (visible) await device.alertAccept()
   */
  async alertExists(): Promise<boolean> {
    const res = await this.run<AlertExistsResponse>(['alert', 'exists'])
    return res.exists
  }

  async alertButtons(): Promise<string[]> {
    const res = await this.run<AlertButtonsResponse>(['alert', 'buttons'])
    return res.buttons
  }

  alertAccept(): Promise<OkResponse> {
    return this.run<OkResponse>(['alert', 'accept'])
  }

  alertDismiss(): Promise<OkResponse> {
    return this.run<OkResponse>(['alert', 'dismiss'])
  }

  alertClick(buttonText: string): Promise<OkResponse> {
    return this.run<OkResponse>(['alert', 'click', '--button', buttonText])
  }

  /**
   * 查找页面元素
   * @example
   * const { elements } = await device.find({ text: '确定' })
   * if (elements.length > 0) {
   *   await device.tap(elements[0].center_x, elements[0].center_y)
   * }
   */
  find(query: FindQuery): Promise<FindResponse> {
    const args: string[] = ['find']
    if (query.text)      args.push('--text', query.text)
    if (query.label)     args.push('--label', query.label)
    if (query.className) args.push('--class-name', query.className)
    if (query.xpath)     args.push('--xpath', query.xpath)
    if (query.name)      args.push('--name', query.name)
    return this.run<FindResponse>(args)
  }

  /**
   * 查找并点击第一个匹配元素
   * @returns 是否找到并点击
   */
  async findAndTap(query: FindQuery): Promise<boolean> {
    const { elements } = await this.find(query)
    if (elements.length === 0) return false
    await this.tap(elements[0].center_x, elements[0].center_y)
    return true
  }

  /** 激活 Siri 并发送语音指令 */
  siri(text: string): Promise<OkResponse> {
    return this.run<OkResponse>(['siri', text])
  }

  // ── 便捷组合方法 ──────────────────────────────────────────

  /**
   * 等待元素出现（轮询）
   * @param query 查找条件
   * @param timeoutMs 超时时间（毫秒），默认 10000
   * @param intervalMs 轮询间隔，默认 500
   */
  async waitForElement(
    query: FindQuery,
    timeoutMs = 10_000,
    intervalMs = 500,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const { count } = await this.find(query)
      if (count > 0) return true
      await new Promise(r => setTimeout(r, intervalMs))
    }
    return false
  }

  /**
   * 等待弹窗出现后自动点击指定按钮
   * @param buttonText 按钮文本，如 '允许' / '确定'
   * @param timeoutMs 超时时间，默认 5000
   */
  async handleAlert(buttonText: string, timeoutMs = 5_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (await this.alertExists()) {
        await this.alertClick(buttonText)
        return true
      }
      await new Promise(r => setTimeout(r, 300))
    }
    return false
  }
}

// ─────────────────────────────────────────────────────────
// 工厂函数（简写）
// ─────────────────────────────────────────────────────────

/**
 * 创建一个 IOSDevice 实例
 * @example
 * import { device } from './ios-device'
 * const d = device('00008140-00191D962283801C')
 * const buf = await d.screenshot()
 */
export function device(udid: string = ''): IOSDevice {
  return new IOSDevice(udid)
}