export interface DeviceApp {
  /** 包名 / Bundle 名 */
  packageName: string
  /** 展示名称 */
  name: string
  version: string
  versionCode?: number
  /** base64 图标（可选） */
  icon?: string
  /** 图标 MIME，默认 image/png */
  iconMimeType?: string
  isSystem: boolean
  /** 鸿蒙启动 Ability（仅 harmony） */
  mainAbility?: string
  /** 安装包大小（字节，可选） */
  sizeBytes?: number
}

export type AppActionResult =
  | { ok: true }
  | { ok: false; error: string; /** 用户取消文件选择 */ cancelled?: boolean }

export type AppsListResult = { ok: true; apps: DeviceApp[] } | { ok: false; error: string }

export interface StartAppPayload {
  packageName: string
  mainAbility?: string
}

export type ScreencapResult =
  | { ok: true; data: string; mimeType: 'image/png' | 'image/jpeg' }
  | { ok: false; error: string }

export interface ListAppsOptions {
  /** 是否包含系统应用，默认 false（仅第三方用户应用） */
  includeSystem?: boolean
}
