/**
 * useAgent - Agent React Hook
 *
 * 将 Agent 主类桥接到 React 组件，提供：
 * - Agent 实例的创建与生命周期管理（单例，跨 send 复用）
 * - AgentEvent → React State 的自动转换
 * - 画布操作（appendNode / clearCanvas）与 Zustand Store 的桥接
 * - 设备状态 / AI 设置 → ToolContext / PromptOptions 的响应式绑定
 * - 消息列表的 UI 友好格式（ChatMessage）
 * - 子目标进度追踪
 *
 * 使用方式：
 * ```tsx
 * const { messages, isGenerating, send, abort, ... } = useAgent()
 * ```
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { useReactFlow } from '@xyflow/react'
import { toast } from 'sonner'

import { useWorkflowStore } from '@/stores/workflow'
import { useDevicesStore } from '@/stores/devices'
import { getAiApiKey, getAiBaseUrl, getAiModel, getBaseUrl } from '@/lib/settings'

import { Agent, type AgentStatus } from './agent'
import { ConversationHistory } from './conversation/history'
import { ToolRegistry } from './tools/registry'
import { createOpenAIAdapter } from './model/openai-adapter'
import type { AgentEvent } from './core/types'
import type { ToolCanvasOps, ToolContext } from './tools/tool-types'
import type { PromptBuilderOptions } from './planning/prompt-builder'

import {
  getDeviceScreenshotTool,
  getUiHierarchyTool,
  getOcrResultTool,
  getInstalledAppsTool,
} from './tools/device-tools'
import { runLiveActionTool } from './tools/action-tools'
import { addWorkflowNodesTool, clearWorkflowCanvasTool } from './tools/canvas-tools'
import { saveChat, loadChat, clearChat as clearPersistedChat } from './persistence'

// ── UI 消息类型 ─────────────────────────────────────────────────────────

/** 工具调用 UI 状态 */
export interface ToolCallState {
  id: string
  name: string
  arguments: string
  status: 'pending' | 'success' | 'error'
  result?: string
  screenshot?: string
}

/** 聊天消息 UI 状态 */
export interface ChatMessage {
  id: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  toolCallId?: string
  reasoning?: string
  isThinking?: boolean
  toolCalls?: ToolCallState[]
  timestamp?: number
}

// ── Hook 返回值 ─────────────────────────────────────────────────────────

export interface UseAgentReturn {
  /** 聊天消息列表 */
  messages: ChatMessage[]
  /** 是否正在生成 */
  isGenerating: boolean
  /** 当前 Agent 状态 */
  agentStatus: AgentStatus
  /** 是否覆盖画布模式 */
  isOverwrite: boolean
  /** 是否实机交互模式 */
  isInteractive: boolean
  /** 子目标列表 */
  subGoals: SubGoalDisplay[]
  /** 设置覆盖/追加模式 */
  setIsOverwrite: (v: boolean) => void
  /** 设置实机交互模式 */
  setIsInteractive: (v: boolean) => void
  /** 发送用户消息，启动 Agent 循环 */
  send: (prompt: string) => Promise<void>
  /** 中止当前运行 */
  abort: () => void
  /** 清空聊天记录，重置 Agent */
  clearChat: () => void
}

// ── 常量 ────────────────────────────────────────────────────────────────

/** 子目标 UI 展示状态 */
export interface SubGoalDisplay {
  /** 序号 */
  index: number
  /** 目标描述 */
  description: string
  /** 当前状态 */
  status: 'pending' | 'running' | 'finished'
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '你好！我是你的智能工作流编排 Copilot。我可以根据你的描述自动构建自动化节点链条。如果开启"实机交互"，我还能即时调取截图与布局树，甚至在你的设备上单步测试自愈。请问今天需要编排什么任务？',
  timestamp: Date.now(),
}

// ── Hook 实现 ───────────────────────────────────────────────────────────

/**
 * useAgent Hook
 *
 * 桥接 Agent 系统到 React 组件，提供消息列表、发送、中止等 API。
 * Agent 实例与 ConversationHistory 在首次 send 时创建并复用，确保跨轮次对话上下文连续。
 */
export function useAgent(): UseAgentReturn {
  const { fitView } = useReactFlow()
  const { rfNodes, rfEdges, setRfNodes, setRfEdges, activeWorkflowId } = useWorkflowStore()
  const selectedDeviceId = useDevicesStore((s) => s.selectedId)

  // ── UI 状态 ─────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [isGenerating, setIsGenerating] = useState(false)
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle')
  const [isOverwrite, setIsOverwrite] = useState(true)
  const [isInteractive, setIsInteractive] = useState(true)
  const [subGoals, setSubGoals] = useState<SubGoalDisplay[]>([])

  // ── Refs（跨 send 持久化） ──────────────────────────────────────
  const agentRef = useRef<Agent | null>(null)
  const historyRef = useRef<ConversationHistory | null>(null)
  const currentNodesRef = useRef<any[]>([])
  const currentEdgesRef = useRef<any[]>([])
  const lastNodeIdRef = useRef<string>('')
  const nodeIndexRef = useRef<number>(0)

  // ── 工作流切换时重置 + 从 localStorage 恢复 ──────────────────────
  const prevWorkflowIdRef = useRef<string | null>(activeWorkflowId)
  useEffect(() => {
    if (prevWorkflowIdRef.current !== activeWorkflowId) {
      prevWorkflowIdRef.current = activeWorkflowId
      agentRef.current?.abort()
      agentRef.current = null
      historyRef.current = null

      // 尝试从 localStorage 恢复
      if (activeWorkflowId) {
        const persisted = loadChat(activeWorkflowId)
        if (persisted && persisted.messages.length > 0) {
          setMessages(persisted.messages)
          setSubGoals(persisted.subGoals)
        } else {
          setMessages([WELCOME_MESSAGE])
          setSubGoals([])
        }
      } else {
        setMessages([WELCOME_MESSAGE])
        setSubGoals([])
      }

      setAgentStatus('idle')
      setIsGenerating(false)
    }
  }, [activeWorkflowId])

  // ── 消息变更时自动持久化 ──────────────────────────────────────────
  useEffect(() => {
    if (activeWorkflowId && messages.length > 0) {
      saveChat(activeWorkflowId, messages, subGoals)
    }
  }, [activeWorkflowId, messages, subGoals])

  // ── 画布操作 ─────────────────────────────────────────────────────

  const prepareCanvas = useCallback(() => {
    let baseNodes: any[] = []
    let baseEdges: any[] = []
    let startNodeId = ''

    if (isOverwrite) {
      const manualNode = rfNodes.find((n: any) => n.type === 'trigger-manual')
      if (manualNode) {
        baseNodes = [manualNode]
      } else {
        const id = nanoid()
        baseNodes = [
          {
            id,
            type: 'trigger-manual',
            label: '手动触发',
            position: { x: 200, y: 100 },
            data: { label: '手动触发', nodeType: 'trigger-manual', params: {} },
          },
        ]
      }
      startNodeId = baseNodes[0].id
      nodeIndexRef.current = 0
    } else {
      baseNodes = [...rfNodes]
      baseEdges = [...rfEdges]

      if (baseNodes.length === 0) {
        const id = nanoid()
        baseNodes = [
          {
            id,
            type: 'trigger-manual',
            label: '手动触发',
            position: { x: 200, y: 100 },
            data: { label: '手动触发', nodeType: 'trigger-manual', params: {} },
          },
        ]
        startNodeId = id
        nodeIndexRef.current = 0
      } else {
        const sourceNodes = new Set(baseEdges.map((e: any) => e.source))
        const leafNodes = baseNodes.filter((n: any) => !sourceNodes.has(n.id))
        if (leafNodes.length > 0) {
          const lastNode = leafNodes.reduce(
            (max: any, node: any) => (node.position.x > max.position.x ? node : max),
            leafNodes[0],
          )
          startNodeId = lastNode.id
          nodeIndexRef.current = Math.round((lastNode.position.x - 200) / 280)
        } else {
          startNodeId = baseNodes[baseNodes.length - 1].id
          nodeIndexRef.current = baseNodes.length - 1
        }
      }
    }

    currentNodesRef.current = baseNodes
    currentEdgesRef.current = baseEdges
    lastNodeIdRef.current = startNodeId

    setRfNodes(baseNodes)
    setRfEdges(baseEdges)
  }, [isOverwrite, rfNodes, rfEdges, setRfNodes, setRfEdges])

  const appendNodeToCanvas = useCallback(
    (step: { type: string; label: string; params: Record<string, unknown> }) => {
      nodeIndexRef.current++
      const nodeId = nanoid()
      const position = { x: 200 + nodeIndexRef.current * 280, y: 100 }

      const newNode = {
        id: nodeId,
        type: step.type,
        position,
        data: {
          label: step.label || step.type,
          nodeType: step.type,
          params: step.params || {},
          postDelayMs: step.type.startsWith('trigger-') ? undefined : 2000,
        },
      }

      const newEdge = {
        id: nanoid(),
        source: lastNodeIdRef.current,
        target: nodeId,
        type: 'default',
        animated: false,
      }

      const nextNodes = [...currentNodesRef.current, newNode]
      const nextEdges = [...currentEdgesRef.current, newEdge]

      currentNodesRef.current = nextNodes
      currentEdgesRef.current = nextEdges
      lastNodeIdRef.current = nodeId

      setRfNodes(nextNodes)
      setRfEdges(nextEdges)

      setTimeout(() => {
        fitView({ duration: 300, padding: 0.2 })
      }, 50)
    },
    [setRfNodes, setRfEdges, fitView],
  )

  // ── ToolCanvasOps 实现 ───────────────────────────────────────────
  const canvasOps = useMemo<ToolCanvasOps>(
    () => ({
      appendNode: appendNodeToCanvas,
      clearCanvas: prepareCanvas,
    }),
    [appendNodeToCanvas, prepareCanvas],
  )

  // ── 创建工具注册中心（单例） ─────────────────────────────────────
  const toolRegistry = useMemo(() => {
    const registry = new ToolRegistry()
    registry.registerAll([
      getDeviceScreenshotTool,
      getUiHierarchyTool,
      getOcrResultTool,
      getInstalledAppsTool,
      runLiveActionTool,
      addWorkflowNodesTool,
      clearWorkflowCanvasTool,
    ])
    return registry
  }, [])

  // ── 发送消息 ─────────────────────────────────────────────────────

  const send = useCallback(
    async (userPrompt: string) => {
      const apiKey = getAiApiKey()
      if (!apiKey) {
        toast.error('请先在设置中配置大模型 API Key')
        return
      }

      setIsGenerating(true)
      prepareCanvas()

      // 获取或创建 ConversationHistory（跨 send 复用）
      if (!historyRef.current) {
        historyRef.current = new ConversationHistory({
          compressThreshold: 50,
          keepRecentCount: 20,
          maxImages: 5,
        })
      }
      const history = historyRef.current

      // 创建模型适配器（每次 send 重新创建，因为 API 配置可能已变）
      const adapter = createOpenAIAdapter({
        apiKey,
        baseUrl: getAiBaseUrl(),
        model: getAiModel(),
      })

      // 构建工具上下文
      const toolContextBase: Omit<ToolContext, 'signal'> = {
        deviceId: selectedDeviceId,
        isInteractive,
        baseUrl: getBaseUrl(),
        canvas: canvasOps,
      }

      // 构建 Prompt 选项
      const promptOptions: PromptBuilderOptions = {
        isInteractive,
        hasDevice: !!selectedDeviceId,
        isOverwrite,
      }

      // 获取或创建 Agent（跨 send 复用，更新上下文）
      if (!agentRef.current) {
        agentRef.current = new Agent({
          adapter,
          toolRegistry,
          history,
          promptOptions,
          toolContextBase,
        })
      } else {
        // 复用已有 Agent，更新运行时上下文（包括 adapter，因为 API 配置可能已变）
        agentRef.current.updateContext({ adapter, promptOptions, toolContextBase })
      }

      const agent = agentRef.current

      // 添加用户消息到 UI
      const userMsg: ChatMessage = {
        id: nanoid(),
        role: 'user',
        content: userPrompt,
        timestamp: Date.now(),
      }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)

      try {
        // 用于累积当前 assistant 消息的状态
        let activeAssistantId: string | null = null
        let accumulatedContent = ''
        let accumulatedReasoning = ''
        const accumulatedToolCalls: ToolCallState[] = []

        // 用可变变量跟踪消息列表，确保跨事件累积
        let currentMessages = newMessages

        for await (const event of agent.run(userPrompt)) {
          // 处理各类事件，更新 UI 状态
          const updated = processAgentEvent(
            event,
            currentMessages,
            activeAssistantId,
            accumulatedContent,
            accumulatedReasoning,
            accumulatedToolCalls,
          )

          if (updated.activeAssistantId) {
            activeAssistantId = updated.activeAssistantId
          }
          accumulatedContent = updated.accumulatedContent
          accumulatedReasoning = updated.accumulatedReasoning

          // 更新子目标
          if (updated.subGoals.length > 0) {
            setSubGoals(updated.subGoals)
          }

          // 累积消息列表（跨事件保持连续性）
          currentMessages = updated.messages
          setMessages([...currentMessages])
        }

        setAgentStatus('completed')
        toast.success('Agent 执行规划完成！')
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          toast.info('Agent 运行已停止')
          setAgentStatus('aborted')
        } else {
          const msg = error instanceof Error ? error.message : String(error)
          console.error(error)
          toast.error(`Agent 报错: ${msg}`)
          setAgentStatus('error')

          // 报错信息写入消息列表
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (last?.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + `\n\n❌ **执行错误**: ${msg}`, isThinking: false },
              ]
            }
            return [
              ...prev,
              { id: nanoid(), role: 'assistant', content: `❌ **执行错误**: ${msg}`, timestamp: Date.now() },
            ]
          })
        }
      } finally {
        setIsGenerating(false)
      }
    },
    [
      messages,
      selectedDeviceId,
      isInteractive,
      isOverwrite,
      toolRegistry,
      canvasOps,
      prepareCanvas,
    ],
  )

  // ── 中止 ─────────────────────────────────────────────────────────

  const abort = useCallback(() => {
    agentRef.current?.abort()
  }, [])

  // ── 清空聊天 ─────────────────────────────────────────────────────

  const clearChat = useCallback(() => {
    abort()
    agentRef.current?.reset()
    agentRef.current = null
    historyRef.current = null
    setMessages([WELCOME_MESSAGE])
    setAgentStatus('idle')
    setSubGoals([])
    // 清除 localStorage 持久化数据
    if (activeWorkflowId) {
      clearPersistedChat(activeWorkflowId)
    }
  }, [abort, activeWorkflowId])

  return {
    messages,
    isGenerating,
    agentStatus,
    isOverwrite,
    isInteractive,
    subGoals,
    setIsOverwrite,
    setIsInteractive,
    send,
    abort,
    clearChat,
  }
}

// ── AgentEvent → ChatMessage 转换 ───────────────────────────────────────

interface EventProcessResult {
  messages: ChatMessage[]
  activeAssistantId: string | null
  accumulatedContent: string
  accumulatedReasoning: string
  subGoals: SubGoalDisplay[]
}

/**
 * 处理单个 AgentEvent，更新消息列表
 *
 * 将 Agent 内部事件转换为 UI 友好的 ChatMessage 格式。
 *
 * @param event - Agent 事件
 * @param currentMessages - 当前消息列表
 * @param activeAssistantId - 当前活跃的 assistant 消息 ID
 * @param accContent - 累积的文本内容
 * @param accReasoning - 累积的思维链内容
 * @param accToolCalls - 累积的工具调用状态
 * @returns 处理结果
 */
function processAgentEvent(
  event: AgentEvent,
  currentMessages: ChatMessage[],
  activeAssistantId: string | null,
  accContent: string,
  accReasoning: string,
  accToolCalls: ToolCallState[],
): EventProcessResult {
  const messages = [...currentMessages]
  const subGoals: SubGoalDisplay[] = []

  switch (event.type) {
    // ── 规划开始：创建新的 assistant 消息壳 ──
    case 'planning:start': {
      const assistantId = nanoid()
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        reasoning: '',
        isThinking: true,
        toolCalls: [],
        timestamp: Date.now(),
      }
      messages.push(assistantMsg)
      return {
        messages,
        activeAssistantId: assistantId,
        accumulatedContent: '',
        accumulatedReasoning: '',
        subGoals,
      }
    }

    // ── 流式进度：更新当前 assistant 消息内容 ──
    case 'task:progress': {
      if (!activeAssistantId) break
      if (event.partial.content) accContent += event.partial.content
      if (event.partial.reasoning) accReasoning += event.partial.reasoning

      // 累积工具调用增量
      if (event.partial.toolCalls) {
        for (const delta of event.partial.toolCalls) {
          const idx = delta.index
          if (!accToolCalls[idx]) {
            accToolCalls[idx] = {
              id: delta.id || `call_${nanoid(8)}`,
              name: '',
              arguments: '',
              status: 'pending',
            }
          }
          if (delta.id) accToolCalls[idx].id = delta.id
          if (delta.name) accToolCalls[idx].name = delta.name
          if (delta.arguments) accToolCalls[idx].arguments += delta.arguments
        }
      }

      const target = messages.find((m) => m.id === activeAssistantId)
      if (target) {
        target.content = accContent
        target.reasoning = accReasoning
        target.toolCalls = accToolCalls.filter(Boolean)
      }
      return { messages, activeAssistantId, accumulatedContent: accContent, accumulatedReasoning: accReasoning, subGoals }
    }

    // ── 规划完成：标记思考完成 ──
    case 'planning:complete': {
      if (!activeAssistantId) break
      const target = messages.find((m) => m.id === activeAssistantId)
      if (target) {
        target.isThinking = false
        target.content = accContent || event.thought
        target.toolCalls = accToolCalls.filter(Boolean)
      }
      return { messages, activeAssistantId, accumulatedContent: accContent, accumulatedReasoning: accReasoning, subGoals }
    }

    // ── 工具调用开始 ──
    case 'tool:call': {
      if (!activeAssistantId) break
      // 更新对应工具调用的状态
      const target = messages.find((m) => m.id === activeAssistantId)
      if (target?.toolCalls) {
        target.toolCalls = target.toolCalls.map((tc) =>
          tc.id === event.toolCallId ? { ...tc, status: 'pending' as const } : tc,
        )
      }
      return { messages, activeAssistantId, accumulatedContent: accContent, accumulatedReasoning: accReasoning, subGoals }
    }

    // ── 工具执行结果 ──
    case 'tool:result': {
      if (!activeAssistantId) break
      const target = messages.find((m) => m.id === activeAssistantId)
      if (target?.toolCalls) {
        target.toolCalls = target.toolCalls.map((tc) =>
          tc.id === event.toolCallId
            ? {
                ...tc,
                status: event.result.success ? ('success' as const) : ('error' as const),
                result: JSON.stringify(event.result.success ? event.result.data : { error: event.result.error }),
                screenshot: event.result.screenshot,
              }
            : tc,
        )
      }

      // 添加 tool 消息到列表
      const toolMsg: ChatMessage = {
        id: nanoid(),
        role: 'tool',
        content: JSON.stringify(event.result.success ? event.result.data : { error: event.result.error }),
        toolCallId: event.toolCallId,
        timestamp: Date.now(),
      }
      messages.push(toolMsg)
      return { messages, activeAssistantId, accumulatedContent: accContent, accumulatedReasoning: accReasoning, subGoals }
    }

    // ── 画布事件：节点添加 ──
    case 'canvas:node-added': {
      // 画布操作由 ToolCanvasOps 直接完成，这里不需要额外 UI 更新
      break
    }

    // ── 画布事件：画布清空 ──
    case 'canvas:cleared': {
      break
    }

    // ── Agent 完成 ──
    case 'agent:complete': {
      if (!activeAssistantId) break
      const target = messages.find((m) => m.id === activeAssistantId)
      if (target) {
        target.isThinking = false
      }
      return { messages, activeAssistantId, accumulatedContent: accContent, accumulatedReasoning: accReasoning, subGoals }
    }

    // ── Agent 错误 ──
    case 'agent:error': {
      if (!activeAssistantId) break
      const target = messages.find((m) => m.id === activeAssistantId)
      if (target) {
        target.isThinking = false
        target.content = target.content + `\n\n❌ **错误**: ${event.error}`
      }
      return { messages, activeAssistantId, accumulatedContent: accContent, accumulatedReasoning: accReasoning, subGoals }
    }

    // ── Agent 中止 ──
    case 'agent:aborted': {
      if (!activeAssistantId) break
      const target = messages.find((m) => m.id === activeAssistantId)
      if (target) {
        target.isThinking = false
      }
      return { messages, activeAssistantId, accumulatedContent: accContent, accumulatedReasoning: accReasoning, subGoals }
    }

    // ── 规划错误 ──
    case 'planning:error': {
      if (!activeAssistantId) break
      const target = messages.find((m) => m.id === activeAssistantId)
      if (target) {
        target.isThinking = false
        target.content = target.content + `\n\n⚠️ **规划错误**: ${event.error}`
      }
      return { messages, activeAssistantId, accumulatedContent: accContent, accumulatedReasoning: accReasoning, subGoals }
    }

    // ── 任务事件（由 task-runner 产出，一般不需要 UI 渲染） ──
    case 'task:start':
    case 'task:complete':
    case 'task:failed': {
      break
    }
  }

  return { messages, activeAssistantId, accumulatedContent: accContent, accumulatedReasoning: accReasoning, subGoals }
}
