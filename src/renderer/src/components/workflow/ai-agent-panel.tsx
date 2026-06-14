import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useReactFlow } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  X,
  Bot,
  Loader2,
  CheckCircle2,
  Send,
  Trash2,
  Shield,
  AlertTriangle,
  Terminal,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Cpu,
  Compass
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { getAiApiKey, getAiBaseUrl, getAiModel, getBaseUrl } from '@/lib/settings'
import { PRESET_EXAMPLES, SYSTEM_PROMPT, WELCOME_MESSAGE } from '@/lib/agent-prompts'
import { useWorkflowStore } from '@/stores/workflow'
import { useDevicesStore } from '@/stores/devices'


// ── 接口定义 ─────────────────────────────────────────────────────────────
interface ToolCallState {
  id: string
  name: string
  arguments: string
  status: 'pending' | 'success' | 'error'
  result?: string
  screenshot?: string // 缓存的截图，用于 inline 渲染
}

interface ChatMessage {
  id: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  toolCallId?: string
  reasoning?: string // 大模型思维链内容（如 DeepSeek-R1）
  isThinking?: boolean
  toolCalls?: ToolCallState[]
}

interface AiAgentPanelProps {
  onClose: () => void
}

export function AiAgentPanel({ onClose }: AiAgentPanelProps): React.JSX.Element {
  const { fitView } = useReactFlow()
  const { rfNodes, rfEdges, setRfNodes, setRfEdges, activeWorkflowId } = useWorkflowStore()
  const selectedDeviceId = useDevicesStore((s) => s.selectedId)

  // ── 状态管理 ─────────────────────────────────────────────────────────────
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGE
    }
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isInteractive, setIsInteractive] = useState(true) // 默认开启实机交互
  const [isOverwrite, setIsOverwrite] = useState(true) // 默认覆盖画布
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true)

  const abortControllerRef = useRef<AbortController | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const activeMessageIdRef = useRef<string | null>(null)

  // React Flow 构建节点的位置锚点
  const currentNodesRef = useRef<any[]>([])
  const currentEdgesRef = useRef<any[]>([])
  const lastNodeIdRef = useRef<string>('')
  const nodeIndexRef = useRef<number>(0)

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 80)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // ── 初始化/准备画布 ────────────────────────────────────────────────────────
  const prepareCanvas = useCallback(() => {
    let baseNodes: any[] = []
    let baseEdges: any[] = []
    let startNodeId = ''

    if (isOverwrite) {
      // 覆盖模式：保留手动触发节点，其余清空
      const manualNode = rfNodes.find((n) => n.type === 'trigger-manual')
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
            data: { label: '手动触发', nodeType: 'trigger-manual', params: {} }
          }
        ]
      }
      startNodeId = baseNodes[0].id
      nodeIndexRef.current = 0
    } else {
      // 追加模式：保留当前画布，找到最末端的叶子节点
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
            data: { label: '手动触发', nodeType: 'trigger-manual', params: {} }
          }
        ]
        startNodeId = id
        nodeIndexRef.current = 0
      } else {
        const sourceNodes = new Set(baseEdges.map((e) => e.source))
        const leafNodes = baseNodes.filter((n) => !sourceNodes.has(n.id))

        if (leafNodes.length > 0) {
          const lastNode = leafNodes.reduce(
            (max, node) => (node.position.x > max.position.x ? node : max),
            leafNodes[0]
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

  // ── 画布中追加单个节点 ──────────────────────────────────────────────────────
  const appendNodeToCanvas = useCallback(
    (step: { type: string; label: string; params: any }) => {
      nodeIndexRef.current++
      const nodeId = nanoid()
      const position = {
        x: 200 + nodeIndexRef.current * 280,
        y: 100
      }

      const newNode = {
        id: nodeId,
        type: step.type,
        position,
        data: {
          label: step.label || step.type,
          nodeType: step.type,
          params: step.params || {},
          postDelayMs: step.type.startsWith('trigger-') ? undefined : 2000
        }
      }

      const newEdge = {
        id: nanoid(),
        source: lastNodeIdRef.current,
        target: nodeId,
        type: 'default',
        animated: false
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
    [setRfNodes, setRfEdges, fitView]
  )

  // ── 工具执行器 (Tool Call Executor) ──────────────────────────────────────
  const executeTool = async (
    name: string,
    argsStr: string
  ): Promise<{ result: any; screenshot?: string }> => {
    let args: any = {}
    try {
      args = JSON.parse(argsStr || '{}')
    } catch (e) {
      return { result: { error: `Failed to parse arguments JSON: ${argsStr}` } }
    }

    // 检查 interactive 模式
    if (
      !isInteractive &&
      ['get_device_screenshot', 'get_ui_hierarchy', 'run_live_action', 'get_ocr_result', 'get_installed_apps'].includes(name)
    ) {
      return {
        result: {
          error: `工具 [${name}] 执行被拦截。原因：用户在面板中禁用了“实机交互模式”，或者没有物理连接设备。请通过 add_workflow_nodes 直接生成静态步骤节点。`
        }
      }
    }

    if (
      ['get_device_screenshot', 'get_ui_hierarchy', 'run_live_action', 'get_ocr_result', 'get_installed_apps'].includes(name) &&
      !selectedDeviceId
    ) {
      return {
        result: {
          error: `无法执行工具 [${name}]，因为当前未连接或未选中任何 Android/HarmonyOS 设备。请指示用户在顶部连接设备，或者退回到静态规划模式生成节点。`
        }
      }
    }

    switch (name) {
      case 'get_device_screenshot': {
        const res = await window.api.screencap.capture(selectedDeviceId!)
        if (res.ok) {
          const imgData = `data:${res.mimeType};base64,${res.data}`
          return {
            result: {
              success: true,
              mimeType: res.mimeType,
              message: '截图成功，请基于多模态大模型和OCR返回的排版数据，解析并确定元素相对坐标。'
            },
            screenshot: imgData
          }
        } else {
          return { result: { error: `截屏失败: ${res.error}` } }
        }
      }

      case 'get_ui_hierarchy': {
        const res = await window.api.devices.dumpLayout(selectedDeviceId!)
        if (res.ok) {
          // 限制 UI Automator 返回的字符串大小以防止 token 溢出
          const maxChar = 30000
          const rawXml = res.data || ''
          const truncated =
            rawXml.length > maxChar
              ? rawXml.slice(0, maxChar) + '\n...[truncated due to length]'
              : rawXml
          return { result: { success: true, uiLayoutDump: truncated } }
        } else {
          return { result: { error: `抓取屏幕 UI 结构失败: ${res.error}` } }
        }
      }

      case 'run_live_action': {
        const { actionType, params } = args
        const testNode = {
          id: nanoid(),
          type: actionType,
          label: `实机测试-${actionType}`,
          params: params || {},
          position: { x: 0, y: 0 }
        }
        const res = await window.api.workflow.runNode({
          node: testNode,
          deviceId: selectedDeviceId!,
          baseUrl: getBaseUrl()
        })
        if (res.ok) {
          return {
            result: { success: true, info: `实机动作 [${actionType}] 已成功在物理设备上试运行。` }
          }
        } else {
          return { result: { error: `实机试运行失败: ${res.error}` } }
        }
      }

      case 'add_workflow_nodes': {
        const { steps } = args
        if (!steps || !Array.isArray(steps)) {
          return { result: { error: '参数 steps 缺失或不是有效的步骤数组' } }
        }
        steps.forEach((step: any) => {
          appendNodeToCanvas(step)
        })
        return {
          result: {
            success: true,
            count: steps.length,
            message: `成功往 React Flow 画布中追加了 ${steps.length} 个节点。`
          }
        }
      }

      case 'clear_workflow_canvas': {
        prepareCanvas()
        return { result: { success: true, message: '画布已成功清空并重置为首个触发器节点。' } }
      }

      case 'get_ocr_result': {
        // 截图
        const capRes = await window.api.screencap.capture(selectedDeviceId!)
        if (!capRes.ok) return { result: { error: `截屏失败: ${capRes.error}` } }
        const imgData = `data:${capRes.mimeType};base64,${capRes.data}`
        // 调用后端 OCR
        const baseUrl = getBaseUrl()
        let ocrItems: { text: string; box: number[][] }[] = []
        try {
          const ocrRes = await fetch(`${baseUrl}/api/v1/ocr/base64`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: capRes.data, use_cls: true, use_det: true, use_rec: true }),
            signal: AbortSignal.timeout(20000)
          })
          const ocrJson = await ocrRes.json()
          ocrItems = ocrJson.data ?? []
        } catch (e: any) {
          return { result: { error: `OCR 请求失败: ${e.message}` }, screenshot: imgData }
        }
        return {
          result: {
            success: true,
            message: `OCR 识别到 ${ocrItems.length} 个文字区块，数据如下（text: 文字, cx/cy: 中心坐标）：`,
            items: ocrItems.map((it) => {
              const xs = it.box.map((p) => p[0])
              const ys = it.box.map((p) => p[1])
              const cx = Math.round((Math.min(...xs) + Math.max(...xs)) / 2)
              const cy = Math.round((Math.min(...ys) + Math.max(...ys)) / 2)
              return { text: it.text, cx, cy }
            })
          },
          screenshot: imgData
        }
      }

      case 'get_installed_apps': {
        const includeSystem = args.includeSystem === true
        const res = await window.api.apps.list(selectedDeviceId!, { includeSystem })
        if (!res.ok) return { result: { error: `获取应用列表失败: ${res.error}` } }
        const apps = res.apps.map((a: any) => ({ packageName: a.packageName, label: a.label ?? '' }))
        return { result: { success: true, count: apps.length, apps } }
      }

      default:
        return { result: { error: `未定义工具: ${name}` } }
    }
  }

  // ── ReAct Agentic Loop ────────────────────────────────────────────────────
  const runAgentLoop = async (userPrompt: string) => {
    const apiKey = getAiApiKey()
    if (!apiKey) {
      toast.error('请先在设置中配置大模型 API Key')
      return
    }

    setIsGenerating(true)
    // 每次生成开始时，将当前 React Flow 画布节点同步
    prepareCanvas()

    const activeUrl = getAiBaseUrl()
    const activeModel = getAiModel()

    // 组装初始消息列表
    let chatHistory: ChatMessage[] = [
      ...messages,
      { id: nanoid(), role: 'user', content: userPrompt }
    ]
    setMessages(chatHistory)
    setPrompt('')

    abortControllerRef.current = new AbortController()

    let turn = 0
    const maxTurns = 50
    let continueLoop = true
    let isFallbackToNoTools = false // 针对不支持 tool-calling 的模型 fallback

    // 声明工具声明
    const toolsPayload = [
      {
        type: 'function',
        function: {
          name: 'get_device_screenshot',
          description:
            '抓取当前选中 Android/HarmonyOS 物理或模拟器设备的屏幕截图（返回 base64）。当不知道按钮坐标或需校验动作结果时调用。'
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_ui_hierarchy',
          description:
            '读取当前选中设备的 UI 控件层级 XML/JSON 结构。用于寻找特定文本的控件以分析位置，配合截图使用。'
        }
      },
      {
        type: 'function',
        function: {
          name: 'run_live_action',
          description:
            '在真实连接设备上即时运行一个测试操作（如点击、滑动、打字、等待），可在插入画布前验证操作是否正确。',
          parameters: {
            type: 'object',
            properties: {
              actionType: {
                type: 'string',
                enum: [
                  'action-launch-app',
                  'action-close-app',
                  'action-tap',
                  'action-double-tap',
                  'action-long-click',
                  'action-swipe',
                  'action-drag',
                  'action-input-text',
                  'action-clear-text',
                  'action-key-event',
                  'control-delay'
                ]
              },
              params: {
                type: 'object',
                description: '动作对应的配置参数'
              }
            },
            required: ['actionType', 'params']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'add_workflow_nodes',
          description:
            '往用户的 React Flow 图形化工作流编辑画布上，批量添加测试编排节点步骤。通常在完成探索或明确流程时调用。',
          parameters: {
            type: 'object',
            properties: {
              steps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      description:
                        '步骤节点类型，如 action-tap, action-launch-app, control-delay 等'
                    },
                    label: { type: 'string', description: '显示在画布节点上的友好中文简短名称' },
                    params: { type: 'object', description: '节点所需参数配置' }
                  },
                  required: ['type', 'label', 'params']
                }
              }
            },
            required: ['steps']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_installed_apps',
          description:
            '获取当前设备已安装应用列表（包名+应用名），用于确认目标应用的 packageName。默认只返回第三方应用，可传 includeSystem=true 包含系统应用。',
          parameters: {
            type: 'object',
            properties: {
              includeSystem: { type: 'boolean', description: '是否包含系统应用，默认 false' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_ocr_result',
          description:
            '对当前设备屏幕进行截图并调用后端 OCR，返回每个文字区块的文字内容及中心坐标(cx, cy)。需要定位具体文字但不想依赖 UI 层级时使用，返回结果可直接用于 action-tap 的坐标或 action-find-and-tap 的 targetText。'
        }
      },
      {
        type: 'function',
        function: {
          name: 'clear_workflow_canvas',
          description: '清除当前画布上除触发器外的全部节点，用于重新覆盖生成工作流。'
        }
      }
    ]

    try {
      while (continueLoop && turn < maxTurns) {
        const assistantId = nanoid()
        activeMessageIdRef.current = assistantId

        // 1. 先向 local chatHistory 放入空壳，同步给 state
        const initialAssistantMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: '',
          reasoning: '',
          isThinking: true,
          toolCalls: []
        }
        chatHistory.push(initialAssistantMsg)
        setMessages([...chatHistory])

        // 构建发给 OpenAI/Gemini 兼容接口的上下文数组
        const apiMessages = chatHistory.map((m) => {
          if (m.role === 'tool') {
            return {
              role: 'tool',
              tool_call_id: m.toolCallId,
              name: m.name,
              content: m.content
            }
          }
          if (m.role === 'assistant') {
            return {
              role: 'assistant',
              content: m.content || '',
              ...(m.toolCalls && m.toolCalls.length > 0
                ? {
                  tool_calls: m.toolCalls.map((tc) => ({
                    id: tc.id,
                    type: 'function',
                    function: {
                      name: tc.name,
                      arguments: tc.arguments
                    }
                  }))
                }
                : {})
            }
          }
          return {
            role: m.role,
            content: m.content
          }
        })

        // 添加 System Prompt
        const messagesPayload = [{ role: 'system', content: SYSTEM_PROMPT }, ...apiMessages]

        // 组装 API 请求体
        const requestBody: Record<string, any> = {
          model: activeModel,
          messages: messagesPayload,
          stream: true
        }

        // 如果模型支持 tool 且没有触发 fallback
        if (!isFallbackToNoTools) {
          requestBody.tools = toolsPayload
          requestBody.tool_choice = 'auto'
        }

        const response = await fetch(`${activeUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current?.signal
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          // 针对有些本地模型不支持 tools 报错，触发 fallback 重试
          if (response.status === 400 && errorText.includes('tools') && !isFallbackToNoTools) {
            isFallbackToNoTools = true
            chatHistory = chatHistory.filter((m) => m.id !== assistantId)
            setMessages([...chatHistory])
            continue // 重新循环以无 tools 形式请求
          }
          throw new Error(`API 请求出错 (${response.status}): ${errorText || response.statusText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('流式数据读取失败')

        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let accumulatedContent = ''
        let accumulatedReasoning = ''
        const accumulatedToolCalls: any[] = []

        const processStreamLine = (line: string) => {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') return

          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6))
              const delta = json.choices?.[0]?.delta
              if (!delta) return

              // 1. 普通对话输出
              if (delta.content) {
                accumulatedContent += delta.content
              }

              // 2. 思维链（R1 等模型）
              if (delta.reasoning_content) {
                accumulatedReasoning += delta.reasoning_content
              }

              // 3. 工具调用 Delta 解析
              if (delta.tool_calls) {
                delta.tool_calls.forEach((tc: any, i: number) => {
                  const idx = tc.index !== undefined ? tc.index : i
                  if (!accumulatedToolCalls[idx]) {
                    accumulatedToolCalls[idx] = {
                      id: tc.id || `call_${nanoid(8)}`,
                      name: '',
                      arguments: '',
                      status: 'pending'
                    }
                  }
                  const builder = accumulatedToolCalls[idx]
                  if (tc.id) builder.id = tc.id
                  if (tc.function?.name) builder.name = tc.function.name
                  if (tc.function?.arguments) builder.arguments += tc.function.arguments
                })
              }
            } catch (e) {
              // 忽略碎片 JSON 解析错
            }
          }
        }

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            processStreamLine(line)
          }

          // 实时刷入 chatHistory，并同步给 state
          const target = chatHistory.find((m) => m.id === assistantId)
          if (target) {
            target.content = accumulatedContent
            target.reasoning = accumulatedReasoning
            target.toolCalls = accumulatedToolCalls.filter(Boolean)
          }
          setMessages([...chatHistory])
        }

        // 处理最后可能残留在 buffer 里的那一行
        if (buffer && buffer.trim()) {
          processStreamLine(buffer)
        }

        // 一次完成的 API 完成，整理状态
        const finalToolCalls = accumulatedToolCalls.filter(Boolean)

        const target = chatHistory.find((m) => m.id === assistantId)
        if (target) {
          target.content = accumulatedContent
          target.reasoning = accumulatedReasoning
          target.isThinking = false
          target.toolCalls = finalToolCalls
        }
        setMessages([...chatHistory])

        // 判断是否需要执行 Tool Call
        if (finalToolCalls.length > 0) {
          // 逐个执行 Tool Call
          for (const tc of finalToolCalls) {
            // 在面板日志上显示 pending
            const { result, screenshot } = await executeTool(tc.name, tc.arguments)

            // 更新当前 assistant 消息的特定工具状态为 success / error，并渲染截图
            const targetAssist = chatHistory.find((m) => m.id === assistantId)
            if (targetAssist && targetAssist.toolCalls) {
              targetAssist.toolCalls = targetAssist.toolCalls.map((item) =>
                item.id === tc.id
                  ? {
                    ...item,
                    status: result.error ? 'error' : 'success',
                    result: JSON.stringify(result),
                    screenshot
                  }
                  : item
              )
            }

            // 构建 Tool 响应消息，塞入 local chatHistory 并同步给 state
            const toolResponseMsg: ChatMessage = {
              id: nanoid(),
              role: 'tool',
              name: tc.name,
              toolCallId: tc.id,
              content: JSON.stringify(result)
            }
            chatHistory.push(toolResponseMsg)
            setMessages([...chatHistory])
          }

          turn++
          // 延时一下以保证 UI 展示流畅，然后进入下一轮 ReAct 询问
          await new Promise((resolve) => setTimeout(resolve, 800))
        } else {
          // 没有工具调用，代表 Agent 已经完成了本次轮询规划
          continueLoop = false

          // 最后的 Fallback 校验：如果不支持 tool 调用，但文本里含 [STEP] 结构
          if (isFallbackToNoTools || accumulatedContent.includes('[STEP]')) {
            const stepLines = accumulatedContent.split('\n')
            stepLines.forEach((line) => {
              const match = line.match(/^\[STEP\]\s*(\{.*\})$/)
              if (match) {
                try {
                  const step = JSON.parse(match[1])
                  if (step && step.type) {
                    appendNodeToCanvas(step)
                  }
                } catch (e) {
                  console.error('Text fallback parse error:', e, line)
                }
              }
            })
          }
        }
      }

      if (turn >= maxTurns) {
        toast.warning('Agent 交互次数已达上限，停止执行。')
      } else {
        toast.success('Agent 执行规划完成！')
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Agent 运行已停止')
      } else {
        console.error(error)
        toast.error(`Agent 报错: ${error.message || error}`)
        // 报错信息写入当前活动消息中
        const activeId = activeMessageIdRef.current
        if (activeId) {
          const target = chatHistory.find((m) => m.id === activeId)
          if (target) {
            target.isThinking = false
            target.content = target.content + `\n\n❌ **执行错误**: ${error.message || error}`
          }
          setMessages([...chatHistory])
        }
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
      activeMessageIdRef.current = null
    }
  }

  // 停止生成
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  // 清空聊天
  const handleClearChat = () => {
    handleStop()
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          '你好！我是你的智能工作流编排 Copilot。我可以根据你的描述自动构建自动化节点链条。如果开启“实机交互”，我还能即时调取截图与布局树，甚至在你的设备上单步测试自愈。请问今天需要编排什么任务？'
      }
    ])
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 380, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="bg-card/95 border-l rounded-l-lg flex flex-col shrink-0 overflow-hidden"
      style={{ minWidth: 0 }}
    >
      {/* ── 头部 ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-background/50">
        <div className="flex items-center gap-2.5">

          <div>
            <h3 className="text-xs font-bold tracking-wide flex items-center gap-1.5 text-foreground">
              Copilot Agent
            </h3>
            <p className="text-[10px] text-muted-foreground">多模态设备交互与画布自动编排</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={handleClearChat}
            title="清空聊天"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── 消息流主区域 ────────────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0 bg-background/30 p-4 rounded-t-lg border-t">
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {messages
              .filter((m) => m.role !== 'system' && m.role !== 'tool')
              .map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                >
                  {/* 消息发送人 */}
                  <span className="text-[9px] font-semibold text-muted-foreground/80 px-1 flex items-center gap-1">
                    {msg.role === 'user' ? (
                      'USER'
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-primary animate-pulse" />
                        COPILOT AGENT
                      </>
                    )}
                  </span>

                  {/* 消息气泡 */}
                  <div
                    className={`relative p-3 rounded-2xl text-xs w-[300px] min-w-0 overflow-hidden shadow-sm transition-all leading-relaxed ${msg.role === 'user'
                      ? 'whitespace-pre-wrap break-all bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-card/75 border border-border/50 rounded-tl-none text-foreground'
                      }`}
                  >
                    {/* 思维链展示 (Reasoning Tracer) */}
                    {msg.reasoning && (
                      <div className="mb-2 bg-indigo-500/5 rounded-r-lg">
                        <button
                          type="button"
                          onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
                          className="w-full flex items-center justify-between text-[10px] font-mono text-indigo-400 px-2 py-1 hover:bg-indigo-500/10 rounded-tr-lg"
                        >
                          <span className="flex items-center gap-1">
                            <Cpu className={`w-3.5 h-3.5 ${msg.isThinking ? 'animate-spin' : ''}`} />
                            {msg.isThinking ? '正在思考中...' : '思考探索链路'}
                          </span>
                          {isReasoningExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                        {isReasoningExpanded && (
                          <div className="px-2 pb-2 text-[10px] font-mono text-muted-foreground/90 max-h-[200px] overflow-y-auto leading-relaxed border-t border-indigo-500/10 prose prose-xs dark:prose-invert max-w-none [&>*:first-child]:mt-1 [&>*:last-child]:mb-0 [&_p]:my-0.5 [&_p]:text-[10px] [&_ul]:my-0.5 [&_ul]:pl-3 [&_ol]:my-0.5 [&_ol]:pl-3 [&_li]:my-0 [&_li]:text-[10px] [&_h1]:text-[11px] [&_h1]:font-bold [&_h1]:my-1 [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:my-1 [&_h3]:text-[10px] [&_h3]:font-semibold [&_h3]:my-0.5 [&_h4]:text-[10px] [&_h4]:font-medium [&_h4]:my-0.5 [&_code]:text-[9px] [&_code]:bg-indigo-500/10 [&_code]:text-indigo-300 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-indigo-500/10 [&_pre]:p-1.5 [&_pre]:rounded [&_pre]:my-1 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:text-indigo-300 [&_strong]:font-bold [&_em]:text-indigo-300/80 [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-400/30 [&_blockquote]:pl-2 [&_blockquote]:my-0.5 [&_blockquote]:text-muted-foreground/70 [&_table]:text-[9px] [&_table]:my-1 [&_th]:font-semibold [&_th]:px-1.5 [&_th]:py-0.5 [&_td]:px-1.5 [&_td]:py-0.5 [&_hr]:my-1 [&_hr]:border-indigo-500/20 [&_a]:text-indigo-400 [&_a]:underline">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.reasoning}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 消息文本内容 */}
                    {msg.content ? (
                      msg.role === 'user' ? (
                        <div className="break-words font-medium">{msg.content}</div>
                      ) : (
                        <div className="break-words prose prose-xs dark:prose-invert max-w-none text-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_code]:text-[10px] [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:text-[10px] [&_th]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-2 [&_blockquote]:text-muted-foreground">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      )
                    ) : (
                      msg.isThinking &&
                      !msg.reasoning &&
                      !msg.toolCalls?.length && (
                        <div className="flex items-center gap-1.5 text-muted-foreground/60 italic font-medium py-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          思考中...
                        </div>
                      )
                    )}

                    {/* 工具调用指示器与执行结果 */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mt-3.5 pt-2.5 border-t border-border/40 space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Terminal className="w-3 h-3" />
                          工具调用动作序列：
                        </p>
                        <div className="space-y-1.5">
                          {msg.toolCalls.map((tc) => {
                            const isPending = tc.status === 'pending'
                            const isSuccess = tc.status === 'success'

                            return (
                              <div
                                key={tc.id}
                                className="rounded-lg border bg-muted/20 border-border/50 p-2 text-[11px] font-mono space-y-1 overflow-hidden min-w-0"
                              >
                                <div className="flex items-center justify-between gap-1 min-w-0">
                                  <span className="font-semibold text-foreground/90 flex items-center gap-1.5 truncate min-w-0">
                                    {isPending ? (
                                      <Loader2 className="w-3 h-3 shrink-0 animate-spin text-primary" />
                                    ) : isSuccess ? (
                                      <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-500" />
                                    ) : (
                                      <AlertTriangle className="w-3 h-3 shrink-0 text-rose-500" />
                                    )}
                                    <span className="truncate">{tc.name}</span>
                                  </span>
                                  <span
                                    className={`shrink-0 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${isPending
                                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                      : isSuccess
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                      }`}
                                  >
                                    {tc.status}
                                  </span>
                                </div>

                                {/* 工具参数简要渲染 */}
                                <div
                                  className="text-[10px] text-muted-foreground overflow-hidden"
                                  title={tc.arguments}
                                >
                                  参数: <span className="text-blue-500 break-all">{tc.arguments}</span>
                                </div>

                                {/* 📷 截图执行后的 inline 预览图像卡片 */}
                                {tc.screenshot && (
                                  <div className="mt-2 rounded-md overflow-hidden border border-border/60 bg-black/5 relative group">
                                    <img
                                      src={tc.screenshot}
                                      alt="Live Screenshot"
                                      className="max-h-[140px] object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.03]"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                      <ImageIcon className="w-5 h-5 text-white" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      {/* ── 预设用例面板 ──────────────────────────────────────────────────────── */}
      {messages.length === 1 && !isGenerating && (
        <div className="p-4 shrink-0 bg-background/50 border-t border-border/30">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">
            快速体验预设任务
          </span>
          <div className="grid grid-cols-1 gap-2">
            {PRESET_EXAMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPrompt(ex.prompt)}
                className="flex flex-col items-start text-left p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted hover:border-primary/40 transition-all cursor-pointer group"
              >
                <span className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-primary/70" />
                  {ex.title}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {ex.prompt}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 对话输入控制 ────────────────────────────────────────────────────── */}
      <div className="p-3 border-t shrink-0 bg-background flex flex-col gap-2">
        {/* 配置栏 */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <Switch
              id="interactive-mode"
              checked={isInteractive}
              onCheckedChange={setIsInteractive}
              className="scale-90 origin-left"
            />
            <Label
              htmlFor="interactive-mode"
              className="text-[11px] font-medium text-foreground cursor-pointer flex items-center gap-1"
            >
              实机演练自愈
              <Shield className="w-3 h-3 text-indigo-400" />
            </Label>
          </div>
          <div className="flex rounded-md bg-muted p-0.5 border border-border/50 scale-90 origin-right">
            <button
              type="button"
              onClick={() => setIsOverwrite(true)}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-all ${isOverwrite ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              覆盖画布
            </button>
            <button
              type="button"
              onClick={() => setIsOverwrite(false)}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-all ${!isOverwrite ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              追加画布
            </button>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const inputPrompt = prompt.trim()
            if (!inputPrompt || isGenerating) return
            void runAgentLoop(inputPrompt)
          }}
          className="flex items-center gap-2 relative bg-muted/50 border border-border/60 rounded-xl p-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all"
        >
          <input
            className="flex-1 bg-transparent border-0 outline-none ring-0 placeholder:text-muted-foreground/60 text-xs px-2 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              !activeWorkflowId
                ? '请先在左侧选择或创建一个工作流'
                : '输入想要规划测试的目标，如“在微信里截图”'
            }
            disabled={isGenerating || !activeWorkflowId}
          />

          {!isGenerating ? (
            <Button
              type="submit"
              disabled={!prompt.trim() || !activeWorkflowId}
              size="icon"
              className="w-8 h-8 rounded-lg shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={handleStop}
              size="icon"
              className="w-8 h-8 rounded-lg shrink-0 animate-pulse"
              title="中断交互"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </Button>
          )}
        </form>
      </div>
    </motion.div>
  )
}
