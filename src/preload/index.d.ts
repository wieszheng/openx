import type { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AppActionResult,
  AppsListResult,
  ListAppsOptions,
  ScreencapResult,
  StartAppPayload,
} from '../shared/device-app'
import type { UnifiedDevice } from '../shared/unified-device'
import type { MirrorActionResult, MirrorMetadata, MirrorOptions, FramePacket } from '../shared/mirror'
import type { RecordStartResult, RecordStopResult } from '../shared/record'
import type { FileListResult, FileDownloadResult, FileUploadResult, FileDeleteResult, FileMkdirResult } from '../shared/files'
import type { WorkflowRunPayload, WorkflowRunResult, ExecutionLog, WorkflowNode } from '../shared/workflow'
import type {
  AgentStartPayload,
  AgentPlanPayload,
  AgentPlanResult,
  AgentApplyRepairPayload,
  AgentApplyRepairResult,
  AgentRunResult,
  AgentSessionSnapshot,
  AgentEvent,
  LlmSettings,
} from '../shared/agent'


interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
}

interface DevicesAPI {
  list: () => Promise<UnifiedDevice[]>
  onListChanged: (cb: (devices: UnifiedDevice[]) => void) => () => void
}

interface AppsAPI {
  list: (deviceId: string, options?: ListAppsOptions) => Promise<AppsListResult>
  start: (deviceId: string, payload: StartAppPayload) => Promise<AppActionResult>
  stop: (deviceId: string, packageName: string) => Promise<AppActionResult>
  uninstall: (deviceId: string, packageName: string) => Promise<AppActionResult>
  install: (deviceId: string) => Promise<AppActionResult>
  clearData: (deviceId: string, packageName: string) => Promise<AppActionResult>
  clearCache: (deviceId: string, packageName: string) => Promise<AppActionResult>
  disable: (deviceId: string, packageName: string) => Promise<AppActionResult>
  enable: (deviceId: string, packageName: string) => Promise<AppActionResult>
}

interface ScreencapAPI {
  capture: (deviceId: string) => Promise<ScreencapResult>
}

interface MirrorAPI {
  start: (deviceId: string, options?: MirrorOptions) => Promise<MirrorActionResult>
  stop: (deviceId: string) => Promise<void>
  openWindow: (deviceId: string) => Promise<{ ok: boolean; error?: string }>
  onMetadata: (cb: (meta: MirrorMetadata) => void) => () => void
  onFrame: (cb: (data: FramePacket) => void) => () => void
  onError: (cb: (msg: string) => void) => () => void
  onWindowClosed: (cb: () => void) => () => void
}

interface ToolkitAPI {
  status: () => Promise<ToolkitStatusResult>
}

interface LogAPI {
  getPath: () => Promise<string>
  read: () => Promise<string>
}

interface DialogAPI {
  openFolder: () => Promise<string | null>
}

interface SettingsAPI {
  getExportDir: () => Promise<string | null>
  setExportDir: (dir: string) => Promise<void>
  getLlm: () => Promise<LlmSettings>
  setLlm: (patch: Partial<LlmSettings>) => Promise<void>
}

interface UpdaterAPI {
  check: () => void
  download: () => void
  install: () => void
  onChecking: (cb: () => void) => () => void
  onAvailable: (cb: (info: { version: string; releaseNotes?: string }) => void) => () => void
  onNotAvailable: (cb: () => void) => () => void
  onProgress: (cb: (info: { percent: number }) => void) => () => void
  onDownloaded: (cb: () => void) => () => void
  onError: (cb: (info: { message: string }) => void) => () => void
}

interface RecordAPI {
  start: (deviceId: string) => Promise<RecordStartResult>
  stop: (deviceId: string) => Promise<RecordStopResult>
}

interface FilesAPI {
  list: (deviceId: string, path: string) => Promise<FileListResult>
  download: (deviceId: string, remotePath: string) => Promise<FileDownloadResult>
  upload: (deviceId: string, remotePath: string) => Promise<FileUploadResult>
  delete: (deviceId: string, remotePath: string) => Promise<FileDeleteResult>
  mkdir: (deviceId: string, remotePath: string) => Promise<FileMkdirResult>
}

interface WorkflowAPI {
  run: (payload: WorkflowRunPayload) => Promise<WorkflowRunResult>
  runNode: (payload: { node: WorkflowNode; deviceId?: string; baseUrl?: string }) => Promise<WorkflowRunResult>
  stop: () => void
  onLog: (cb: (log: ExecutionLog) => void) => () => void
  onDone: (cb: (result: { status: 'done' | 'error' | 'stopped'; error?: string }) => void) => () => void
}

interface AgentAPI {
  plan: (payload: AgentPlanPayload) => Promise<AgentPlanResult>
  applyRepair: (payload: AgentApplyRepairPayload) => Promise<AgentApplyRepairResult>
  start: (payload: AgentStartPayload) => Promise<AgentRunResult>
  pause: () => Promise<AgentRunResult>
  resume: () => Promise<AgentRunResult>
  step: () => Promise<AgentRunResult>
  stop: () => void
  getSession: () => Promise<AgentSessionSnapshot>
  onEvent: (cb: (event: AgentEvent) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      window: WindowAPI
      devices: DevicesAPI
      apps: AppsAPI
      screencap: ScreencapAPI
      mirror: MirrorAPI
      files: FilesAPI
      toolkit: ToolkitAPI
      log: LogAPI
      updater: UpdaterAPI
      dialog: DialogAPI
      settings: SettingsAPI
      record: RecordAPI
      workflow: WorkflowAPI
      agent: AgentAPI
    }
  }
}

export {}
