/**
 * Agent 模块统一导出
 */

// ── 核心类型 ──
export type {
  AgentEvent,
  StreamChunk,
  ToolCallDelta,
  PlanningAction,
  LocateInfo,
  TaskStatus,
  ExecutionTask,
  LocateResult,
  ToolResult,
  ToolCall,
  CanvasNode,
  AgentConfig,
} from './core/types'

// ── 对话历史 ──
export type {
  SubGoalStatus,
  SubGoal,
  HistoryMessage,
  HistoryToolCall,
  ToolFeedback,
} from './conversation/message-types'

export { ConversationHistory } from './conversation/history'
export type { ConversationHistoryConfig } from './conversation/history'

// ── 规划模块 ──
export { buildSystemPrompt } from './planning/prompt-builder'
export type { PromptBuilderOptions } from './planning/prompt-builder'

export { parsePlanningResult } from './planning/plan-parser'

export { plan } from './planning/planner'
export type { PlannerConfig } from './planning/planner'

// ── 核心循环 ──
export { buildTasks } from './core/task-builder'
export type { TaskBuilderOptions } from './core/task-builder'

export { runTasks } from './core/task-runner'
export type { TaskRunnerOptions } from './core/task-runner'

export { ExecutionSession } from './core/execution-session'
export type { SessionStatus } from './core/execution-session'

export { executeLoop } from './core/task-executor'
export type { TaskExecutorRunOptions } from './core/task-executor'

// ── 工具系统 ──
export type {
  ToolParamProperty,
  ToolParamSchema,
  ToolContext,
  ToolCanvasOps,
  ToolDefinition,
  OpenAIToolPayload,
} from './tools/tool-types'

export { defineTool } from './tools/define-tool'
export type { DefineToolConfig } from './tools/define-tool'
export { ToolRegistry } from './tools/registry'

// ── 模型层 ──
export type {
  ModelConfig,
  MessageRole,
  ChatMessage,
  ApiMessage,
  ChatCompletionParams,
  ParsedStreamResult,
  PlanningResult,
} from './model/model-types'

export { StreamParser, readStreamChunks, splitSseLines } from './model/stream-parser'
export type { ModelAdapter } from './model/adapter'
export { isToolsUnsupportedError } from './model/adapter'
export { createOpenAIAdapter, OpenAIAdapterError } from './model/openai-adapter'

// ── 工具实现 ──
export {
  getDeviceScreenshotTool,
  getUiHierarchyTool,
  getOcrResultTool,
  getInstalledAppsTool,
} from './tools/device-tools'

export { runLiveActionTool } from './tools/action-tools'

export { addWorkflowNodesTool, clearWorkflowCanvasTool } from './tools/canvas-tools'

// ── 集成层 ──
export { Agent } from './agent'
export type { AgentDeps, AgentStatus } from './agent'

export { useAgent } from './use-agent'
export type { UseAgentReturn, ChatMessage as AgentChatMessage, ToolCallState, SubGoalDisplay } from './use-agent'

// ── 持久化 ──
export { saveChat, loadChat, clearChat } from './persistence'
