/**
 * useAgent —— 把 AgentLoop 的事件流桥接为 React 聊天状态
 *
 * panel 只负责渲染 messages 与配置开关；所有控制流在 AgentLoop 中，
 * 本 hook 把 AgentEvent 折叠进 messages 数组并驱动 UI。
 */
import { useCallback, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import { getAiApiKey, getAiBaseUrl, getAiModel } from '@/lib/settings'
import { WELCOME_MESSAGE } from '@/lib/prompts'
import { AgentLoop } from './agent-loop'
import { ToolRuntime } from './tool-runtime'
import type { ToolRuntimeDeps } from './tool-runtime'
import type { AgentEvent, ActionCategory } from './types'

export interface ToolCallState {
  id: string
  name: string
  arguments: string
  status: 'pending' | 'success' | 'error'
  result?: string
  screenshot?: string
  category?: ActionCategory
}

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  reasoning?: string
  isThinking?: boolean
  toolCalls?: ToolCallState[]
}

function welcome(): ChatMessage {
  return { id: 'welcome', role: 'assistant', content: WELCOME_MESSAGE }
}

export interface UseAgentOptions {
  /** ToolRuntime 依赖：设备/交互/画布回调，由 panel 注入 */
  deps: ToolRuntimeDeps
}

export function useAgent({ deps }: UseAgentOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([welcome()])
  const [isGenerating, setIsGenerating] = useState(false)
  const loopRef = useRef<AgentLoop | null>(null)
  const depsRef = useRef(deps)
  depsRef.current = deps

  // 更新指定 assistant 消息
  const patchMessage = useCallback(
    (id: string, patch: (m: ChatMessage) => ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? patch(m) : m)))
    },
    []
  )

  const handleEvent = useCallback(
    (e: AgentEvent) => {
      switch (e.type) {
        case 'turn-start':
          setMessages((prev) => [
            ...prev,
            { id: e.messageId, role: 'assistant', content: '', reasoning: '', isThinking: true, toolCalls: [] }
          ])
          break
        case 'reasoning':
          // R1 等模型的思维链增量（真增量，追加）
          patchMessage(e.messageId, (m) => ({ ...m, reasoning: (m.reasoning || '') + (e.text || '') }))
          break
        case 'thought':
          // XML <thought> 快照（整段替换，渲染到思考链路区）
          patchMessage(e.messageId, (m) => ({ ...m, reasoning: e.text || '' }))
          break
        case 'content':
          // 面向用户的正文快照（<log> 或完成语，整段替换）
          patchMessage(e.messageId, (m) => ({ ...m, content: e.text || '' }))
          break
        case 'turn-end':
          patchMessage(e.messageId, (m) => ({ ...m, isThinking: false }))
          break
        case 'tool-start':
          if (e.tool) {
            const tool = e.tool
            patchMessage(e.messageId, (m) => ({
              ...m,
              toolCalls: [...(m.toolCalls || []), { ...tool }]
            }))
          }
          break
        case 'tool-end':
          if (e.tool) {
            const tool = e.tool
            patchMessage(e.messageId, (m) => ({
              ...m,
              toolCalls: (m.toolCalls || []).map((t) => (t.id === tool.id ? { ...t, ...tool } : t))
            }))
          }
          break
        case 'complete':
          if (e.finalize?.message) {
            patchMessage(e.messageId, (m) => ({
              ...m,
              isThinking: false,
              content: m.content || e.finalize!.message || ''
            }))
          }
          if (e.finalize?.success === false) {
            toast.warning('Agent 判定任务未达成')
          } else {
            toast.success('Agent 执行规划完成！')
          }
          break
        case 'aborted':
          toast.info('Agent 运行已停止')
          break
        case 'error':
          toast.error(`Agent 报错: ${e.text}`)
          if (e.messageId) {
            patchMessage(e.messageId, (m) => ({
              ...m,
              isThinking: false,
              content: `${m.content}\n\n❌ **执行错误**: ${e.text}`
            }))
          }
          break
      }
    },
    [patchMessage]
  )

  const send = useCallback(
    async (prompt: string) => {
      const apiKey = getAiApiKey()
      if (!apiKey) {
        toast.error('请先在设置中配置大模型 API Key')
        return
      }

      // 推入用户消息
      setMessages((prev) => [...prev, { id: nanoid(), role: 'user', content: prompt }])
      setIsGenerating(true)

      // 本次会话的技能加载记录（防同一技能正文重复灌入上下文）
      const loadedSkills = new Set<string>()
      const runtime = new ToolRuntime({
        ...depsRef.current,
        isSkillLoaded: (name) => loadedSkills.has(name),
        markSkillLoaded: (name) => loadedSkills.add(name)
      })
      const loop = new AgentLoop({
        apiKey,
        baseUrl: getAiBaseUrl(),
        model: getAiModel(),
        interactive: depsRef.current.isInteractive(),
        toolRuntime: runtime,
        onEvent: handleEvent
      })
      loopRef.current = loop

      try {
        await loop.run(prompt)
      } finally {
        setIsGenerating(false)
        loopRef.current = null
      }
    },
    [handleEvent]
  )

  const stop = useCallback(() => {
    loopRef.current?.abort()
  }, [])

  const clear = useCallback(() => {
    loopRef.current?.abort()
    setMessages([welcome()])
  }, [])

  return { messages, isGenerating, send, stop, clear }
}
