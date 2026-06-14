/**
 * ExecutionSession - 执行会话管理
 *
 * 对标 Midscene 的 ExecutionSession，是 TaskRunner 的薄封装层。
 * 代表一次线性执行会话，提供更语义化的 API。
 *
 * 设计意图：
 * - 隐藏 TaskRunner 的直接操作
 * - 每次规划循环创建新的 Session，确保不同操作之间隔离
 * - 追踪会话级别的错误状态
 */

import type { ExecutionTask, AgentEvent } from './types'
import { runTasks, type TaskRunnerOptions } from './task-runner'

/** 执行会话状态 */
export type SessionStatus = 'idle' | 'running' | 'completed' | 'error'

/**
 * 执行会话
 *
 * 封装一次任务执行过程，提供追加任务、执行、状态查询等能力。
 * 每次规划循环创建一个新的 ExecutionSession。
 */
export class ExecutionSession {
  private tasks: ExecutionTask[] = []
  private _status: SessionStatus = 'idle'
  private _lastError: string | null = null

  /** 当前会话状态 */
  get status(): SessionStatus {
    return this._status
  }

  /** 最后一次错误 */
  get lastError(): string | null {
    return this._lastError
  }

  /** 是否处于错误状态 */
  get isInErrorState(): boolean {
    return this._status === 'error'
  }

  /** 获取所有任务 */
  getTasks(): readonly ExecutionTask[] {
    return [...this.tasks]
  }

  /** 获取最后失败的任务 */
  getLastErrorTask(): ExecutionTask | undefined {
    return this.tasks.find((t) => t.status === 'failed')
  }

  /**
   * 追加任务到会话
   *
   * @param newTasks - 要追加的任务列表
   */
  append(newTasks: ExecutionTask[]): void {
    this.tasks.push(...newTasks)
  }

  /**
   * 追加任务并执行
   *
   * @param newTasks - 要追加的任务列表
   * @param options - TaskRunner 执行选项
   * @yields AgentEvent - 执行过程中的状态事件
   */
  async *appendAndRun(
    newTasks: ExecutionTask[],
    options: TaskRunnerOptions,
  ): AsyncGenerator<AgentEvent> {
    this.append(newTasks)
    yield* this.run(options)
  }

  /**
   * 执行当前所有待处理任务
   *
   * @param options - TaskRunner 执行选项
   * @yields AgentEvent - 执行过程中的状态事件
   */
  async *run(options: TaskRunnerOptions): AsyncGenerator<AgentEvent> {
    if (this._status === 'running') return

    this._status = 'running'

    // 过滤出 pending 任务
    const pendingTasks = this.tasks.filter((t) => t.status === 'pending')

    for await (const event of runTasks(pendingTasks, options)) {
      // 监听失败事件，更新会话状态
      if (event.type === 'task:failed') {
        this._status = 'error'
        this._lastError = event.error
      }

      yield event
    }

    // 如果没有错误，标记为完成
    if (this._status === 'running') {
      this._status = 'completed'
    }
  }

  /**
   * 追加错误终止任务
   *
   * 创建一个必定失败的任务并执行，用于优雅地终止会话。
   */
  async *appendErrorPlan(errorMsg: string, _options: TaskRunnerOptions): AsyncGenerator<AgentEvent> {
    const errorTask: ExecutionTask = {
      id: '__error_termination__',
      actionType: '__error__',
      params: { error: errorMsg },
      status: 'pending',
    }

    this.append([errorTask])
    this._status = 'error'
    this._lastError = errorMsg

    yield { type: 'task:failed', taskId: errorTask.id, error: errorMsg }
  }
}
