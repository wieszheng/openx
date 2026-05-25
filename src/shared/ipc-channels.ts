/** 主进程 ↔ 渲染进程 IPC 通道名（main / preload 共用） */
export const IPC = {
  window: {
    minimize: 'window-minimize',
    maximize: 'window-maximize',
    close: 'window-close',
    isMaximized: 'window-is-maximized'
  },
  devices: {
    list: 'devices:list',
    listChanged: 'devices:list-changed'
  },
  shell: {
    exec: 'shell:exec'
  },
  apps: {
    list: 'apps:list',
    start: 'apps:start',
    stop: 'apps:stop',
    uninstall: 'apps:uninstall',
    install: 'apps:install',
    clearData: 'apps:clear-data',
    clearCache: 'apps:clear-cache',
    disable: 'apps:disable',
    enable: 'apps:enable'
  },
  screencap: {
    capture: 'screencap:capture'
  },
  mirror: {
    start: 'mirror:start',
    stop: 'mirror:stop',
    openWindow: 'mirror:open-window',
    /** main → renderer: MirrorMetadata */
    metadata: 'mirror:metadata',
    /** main → renderer: FramePacket */
    frame: 'mirror:frame',
    /** main → renderer: string (error message) */
    error: 'mirror:error',
    /** main → main-window renderer: mirror window was closed */
    windowClosed: 'mirror:window-closed'
  },
  record: {
    start: 'record:start',
    stop: 'record:stop',
  },
  files: {
    list: 'files:list',
    download: 'files:download',
    upload: 'files:upload',
    delete: 'files:delete',
    mkdir: 'files:mkdir',
  },
  toolkit: {
    status: 'toolkit:status',
  },
  log: {
    getPath: 'log:get-path',
    read: 'log:read',
  },
  dialog: {
    /** renderer → main: 打开文件夹选择器，返回路径或 null */
    openFolder: 'dialog:open-folder',
    /** renderer → main: 打开文件选择器，返回路径或 null */
    openFile: 'dialog:open-file',
  },
  settings: {
    /** renderer → main: 获取导出目录 */
    getExportDir: 'settings:get-export-dir',
    /** renderer → main: 设置导出目录 */
    setExportDir: 'settings:set-export-dir',
  },
  updater: {
    /** renderer → main: 手动检查更新 */
    check: 'updater:check',
    /** renderer → main: 开始下载 */
    download: 'updater:download',
    /** renderer → main: 退出并安装 */
    install: 'updater:install',
    /** main → renderer: 正在检查 */
    checking: 'updater:checking',
    /** main → renderer: 有可用更新 { version, releaseNotes } */
    available: 'updater:available',
    /** main → renderer: 已是最新版本 */
    notAvailable: 'updater:not-available',
    /** main → renderer: 下载进度 { percent } */
    progress: 'updater:progress',
    /** main → renderer: 下载完成 */
    downloaded: 'updater:downloaded',
    /** main → renderer: 错误 { message } */
    error: 'updater:error',
  },
  debug: {
    ping: 'ping'
  }
} as const
