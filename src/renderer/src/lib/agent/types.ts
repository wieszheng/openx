/**
 * AI Agent 运行时类型定义
 *
 * - ActionDef / ActionSpace 是「LLM 可见动作」的单一事实来源
 * - PlanResult 是 XML 协议单轮解析结果
 * - AgentEvent 是 loop → UI 的单向事件流，使 loop 不依赖 React
 */

// ── ActionSpace ─────────────────────────────────────────────────────────────

export type ParamType = 'string' | 'number' | 'boolean' | 'object' | 'array'

/** 单个参数字段的自描述结构（零依赖，替代 zod） */
export interface ParamField {
  type: ParamType
  description?: string
  required?: boolean
  default?: unknown
  enum?: readonly string[]
}

/** 动作分类：canvas=写入工作流画布节点；perception=实机感知/验证；meta=元动作（技能加载/画布管理，不碰设备） */
export type ActionCategory = 'canvas' | 'perception' | 'meta'

/** 一个 LLM 可调用动作的声明 */
export interface ActionDef {
  /** 动作标识，canvas 类即节点类型（如 action-find-and-tap）；perception 类为工具名 */
  name: string
  /** 画布/界面显示用的中文短名 */
  label: string
  /** 喂给 LLM 的能力描述 */
  description: string
  category: ActionCategory
  /** 参数字段表，驱动提示词生成与执行前校验 */
  params: Record<string, ParamField>
  /** 示例参数，写进提示词帮助模型对齐结构 */
  sample?: Record<string, unknown>
  /** 是否必须连接物理设备 */
  requiresDevice?: boolean
}

// ── Skill（技能/配方）─────────────────────────────────────────────────────

/**
 * 一个可复用的「技能」——封装某类任务的领域知识与最佳实践步骤。
 * 借鉴 Claude Code Skills 的渐进式披露：system prompt 只暴露 name+description，
 * 模型判断相关时再用 load_skill 动作拉取完整 instructions 注入上下文。
 */
export interface Skill {
  /** 唯一标识，load_skill 用它引用 */
  name: string
  /** 一句话能力描述（进 system prompt 清单，决定模型是否加载） */
  description: string
  /** 适用场景关键词，帮助模型匹配（可选，附在 description 后） */
  whenToUse?: string
  /** 完整指令正文（被 load_skill 拉取后注入上下文） */
  instructions: string
}

// ── XML 协议单轮解析结果 ──────────────────────────────────────────────────

/** 模型规划出的一个动作 */
export interface PlannedAction {
  type: string
  param: Record<string, unknown>
}

/** 任务完成信号 */
export interface FinalizeResult {
  success: boolean
  message?: string
}

/** parseXMLResponse 的产物 */
export interface PlanResult {
  thought?: string
  log?: string
  memory?: string
  action?: PlannedAction
  error?: string
  finalize?: FinalizeResult
}

// ── 工具执行 ────────────────────────────────────────────────────────────────

/** 工具/动作执行结果，result 会被序列化喂回模型 */
export interface ToolResult {
  result: Record<string, unknown>
  /** 截图 dataURL，仅用于 UI inline 渲染，不进 LLM 文本 */
  screenshot?: string
}

// ── Loop → UI 事件 ──────────────────────────────────────────────────────────

export type AgentEventType =
  | 'turn-start' // 新一轮规划开始，携带占位 assistant 消息 id
  | 'reasoning' // 思维链增量（reasoning_content）
  | 'thought' // <thought> 文本增量
  | 'content' // 面向用户的正文增量（<log> / 完成语）
  | 'tool-start' // 即将执行某动作
  | 'tool-end' // 动作执行完毕（带状态/结果/截图）
  | 'turn-end' // 本轮 LLM 输出结束
  | 'complete' // 收到 <complete>
  | 'error' // 异常
  | 'aborted' // 用户中断

export interface AgentEvent {
  type: AgentEventType
  messageId: string
  /** 文本增量或快照（reasoning/thought/content/error） */
  text?: string
  /** 工具事件载荷 */
  tool?: {
    id: string
    name: string
    arguments: string
    status: 'pending' | 'success' | 'error'
    result?: string
    screenshot?: string
    /** 动作分类，供 UI 按类型区分图标/配色 */
    category?: ActionCategory
  }
  finalize?: FinalizeResult
}

export type AgentEventHandler = (event: AgentEvent) => void
