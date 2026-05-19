export type ToolkitItemStatus = {
  name: 'adb' | 'hdc' | 'aapt'
  label: string
  /** 实际使用的可执行路径或命令名 */
  resolved: string
  /** 包内/环境变量覆盖的绝对路径 */
  bundledPath: string | null
  /** 来源说明 */
  source: 'bundled' | 'env' | 'system'
  ready: boolean
  version?: string
}

export type ToolkitStatusResult = {
  toolkitRoot: string
  items: ToolkitItemStatus[]
}
