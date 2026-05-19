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
  log: {
    getPath: 'log:get-path'
  },
  debug: {
    ping: 'ping'
  }
} as const
