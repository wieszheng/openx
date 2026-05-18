import log from 'electron-log/main'
import { app } from 'electron'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'

let initialized = false

/** 初始化 electron-log（主进程入口最早调用） */
export function initLog(): void {
  if (initialized) {
    return
  }
  initialized = true

  log.initialize({ preload: true })

  log.transports.file.resolvePathFn = () => join(app.getPath('userData'), 'logs', 'main.log')
  log.transports.file.maxSize = 5 * 1024 * 1024

  const level = is.dev ? 'debug' : 'info'
  log.transports.file.level = level
  log.transports.console.level = level

  log.errorHandler.startCatching()
  log.eventLogger.startLogging()
}

/** 带 scope 的 logger，用法：createLogger('adbBase').debug('shell', cmd) */
export function createLogger(scope: string): ReturnType<typeof log.scope> {
  return log.scope(scope)
}

export function getLogPath(): string {
  return log.transports.file.getFile().path
}

export { log }
