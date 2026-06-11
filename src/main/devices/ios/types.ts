export interface OkResponse {
  ok: true
  error?: string
  [key: string]: unknown
}

export interface ScreenshotResponse extends OkResponse {
  image: string
  format: 'png'
  width: number
  height: number
  mode: string
}

export interface ScreenshotSaveResponse extends OkResponse {
  path: string
  width: number
  height: number
  mode: string
}

export interface TapResponse extends OkResponse {
  x: number
  y: number
}

export interface SwipeResponse extends OkResponse {
  from: [number, number]
  to: [number, number]
  duration: number
}

export interface AppInfo {
  bundle_id: string
  pid: number
  name: string
}

export interface AppCurrentResponse extends OkResponse, AppInfo {}

export interface AppListItem {
  bundle_id: string
  name: string
}

export interface AppListResponse extends OkResponse {
  apps: AppListItem[]
  count: number
}

export interface WindowSize {
  width: number
  height: number
}

export interface DeviceInfoResponse extends OkResponse {
  device_info: Record<string, unknown>
  window_size: WindowSize
  scale: number
}

export interface WindowSizeResponse extends OkResponse, WindowSize {
  scale: number
}

export interface LockedResponse extends OkResponse {
  locked: boolean
}

export interface ClipboardResponse extends OkResponse {
  text: string
}

export type AlertAction = 'exists' | 'buttons' | 'accept' | 'dismiss' | 'click'

export interface AlertExistsResponse extends OkResponse {
  exists: boolean
}

export interface AlertButtonsResponse extends OkResponse {
  buttons: string[]
}

export interface ElementBounds {
  x: number
  y: number
  width: number
  height: number
  center_x: number
  center_y: number
}

export interface ElementInfo extends ElementBounds {
  text: string
  label: string
}

export interface FindResponse extends OkResponse {
  elements: ElementInfo[]
  count: number
}

export interface FindQuery {
  text?: string
  label?: string
  className?: string
  xpath?: string
  name?: string
}

export type SwipeDirection = 'up' | 'down' | 'left' | 'right'
