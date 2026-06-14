/**
 * Agent - 顶层编排器
 *
 * 对标 Midscene 的 AIChatInterface + TaskExecutor，是 Agent 系统的统一入口。
 * 封装了 Plan-Execute-Observe-Replan 循环的全部依赖：
 *
 * - ToolRegistry：工具注册与执行
 * - ConversationHistory：对话历史管理
 * - ModelAdapter：模型适配器
 * - executeLoop：核心循环
 *
 * 使用方式：
 * ```ts
 * const agent = new Agent({ ... })
 * for await (const event of agent.run('启动微信并截图')) {
 *   // 处理事件
 * }
 * ```
 */

import type { AgentEvent, AgentConfig } from './core/types'
import type { ModelAdapter } from './model/adapter'
import type { ToolRegistry } from './tools/registry'
import type { ToolContext } from './tools/tool-types'
import type { PromptBuilderOptions } from './planning/prompt-builder'
import type { ConversationHistory } from './conversation/history'
import { executeLoop, type TaskExecutorRunOptions } from './core/task-executor'

/** Agent 运行时依赖 */
export interface AgentDeps {
  /** 模型适配器（由调用方根据配置创建） */
  adapter: ModelAdapter
  /** 工具注册中心（已注册所有工具） */
  toolRegistry: ToolRegistry
  /** 对话历史管理器 */
  history: ConversationHistory
  /** Prompt 构建选项 */
  promptOptions: PromptBuilderOptions
  /** 工具执行上下文（不含 signal，运行时注入） */
  toolContextBase: Omit<ToolContext, 'signal'>
  /** Agent 配置 */
  config?: AgentConfig
}

/** Agent 状态 */
export type AgentStatus = 'idle' | 'running' | 'aborted' | 'completed' | 'error'

/**
 * Agent 主类
 *
 * 顶层编排器，封装 Plan-Execute-Observe-Replan 循环。
 * 提供 `run()` 启动循环，`abort()` 中止，`reset()` 清空状态。
 * 通过 AsyncGenerator 推送 AgentEvent，由调用方（如 useAgent Hook）消费。
 */
export class Agent {
  private readonly deps: AgentDeps
  private _status: AgentStatus = 'idle'
  private _lastError: string | null = null
  private _abortController: AbortController | null = null

  constructor(deps: AgentDeps) {
    this.deps = deps
  }

  /** 当前状态 */
  get status(): AgentStatus {
    return this._status
  }

  /** 最后一次错误 */
  get lastError(): string | null {
    return this._lastError
  }

  /** 是否正在运行 */
  get isRunning(): boolean {
    return this._status === 'running'
  }

  /** 对话历史（只读访问） */
  get history(): ConversationHistory {
    return this.deps.history
  }

  /** 工具注册中心（只读访问） */
  get toolRegistry(): ToolRegistry {
    return this.deps.toolRegistry
  }

  /**
   * 启动 Agent 循环
   *
   * 执行 Plan → Execute → Observe → Replan 循环，
   * 通过 yield 推送实时事件。
   *
   * @param userPrompt - 用户输入
   * @yields AgentEvent - 运行过程中的所有事件
   */
  async *run(userPrompt: string): AsyncGenerator<AgentEvent> {
    if (this._status === 'running') {
      throw new Error('Agent is already running')
    }

    this._status = 'running'
    this._lastError = null
    this._abortController = new AbortController()

    const toolContext: ToolContext = {
      ...this.deps.toolContextBase,
      signal: this._abortController.signal,
    }

    const options: TaskExecutorRunOptions = {
      userPrompt,
      adapter: this.deps.adapter,
      history: this.deps.history,
      toolRegistry: this.deps.toolRegistry,
      toolContext,
      promptOptions: this.deps.promptOptions,
      config: this.deps.config ?? {},
    }

    try {
      for await (const event of executeLoop(options, this._abortController.signal)) {
        yield event
      }
      this._status = 'completed'
    } catch (error: unknown) {
      if (this._abortController.signal.aborted) {
        this._status = 'aborted'
      } else {
        this._status = 'error'
        this._lastError = error instanceof Error ? error.message : String(error)
      }
      throw error
    } finally {
      this._abortController = null
    }
  }

  /**
   * 中止当前运行
   */
  abort(): void {
    if (this._abortController) {
      this._abortController.abort()
      this._status = 'aborted'
    }
  }

  /**
   * 重置 Agent 状态
   *
   * 清空对话历史和运行状态，可重新开始。
   */
  reset(): void {
    this.abort()
    this.deps.history.reset()
    this._status = 'idle'
    this._lastError = null
  }

  /**
   * 更新运行时上下文
   *
   * 允许在运行间隙更新适配器、Prompt 选项和工具上下文，
   * 如切换模型、切换实机交互模式、切换设备等。
   *
   * @param updates - 要更新的字段
   */
  updateContext(updates: Partial<Pick<AgentDeps, 'adapter' | 'promptOptions' | 'toolContextBase'>>): void {
    if (updates.adapter) {
      this.deps.adapter = updates.adapter
    }
    if (updates.promptOptions) {
      Object.assign(this.deps.promptOptions, updates.promptOptions)
    }
    if (updates.toolContextBase) {
      Object.assign(this.deps.toolContextBase, updates.toolContextBase)
    }
  }
}
