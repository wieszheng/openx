import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import { useReactFlow } from '@xyflow/react'
import { nanoid } from 'nanoid'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  X,
  Bot,
  Loader2,
  Send,
  Trash2,
  Terminal,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Cpu,
  Compass,
  Eye,
  BookOpen,
  Workflow as WorkflowIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getBaseUrl } from '@/lib/settings'
import { PRESET_EXAMPLES } from '@/lib/prompts'
import { useAgent } from '@/lib/agent/use-agent'
import type { ChatMessage, ToolCallState } from '@/lib/agent/use-agent'
import { useWorkflowStore } from '@/stores/workflow'
import { useDevicesStore } from '@/stores/devices'

interface AiAgentPanelProps {
  onClose: () => void
}

export function AiAgentPanel({ onClose }: AiAgentPanelProps): React.JSX.Element {
  const { fitView } = useReactFlow()
  const { rfNodes, rfEdges, setRfNodes, setRfEdges, activeWorkflowId } = useWorkflowStore()
  const selectedDeviceId = useDevicesStore((s) => s.selectedId)

  const [prompt, setPrompt] = useState('')
  const [isOverwrite, setIsOverwrite] = useState(true) // 默认覆盖画布
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // React Flow 构建节点的位置锚点
  const currentNodesRef = useRef<any[]>([])
  const currentEdgesRef = useRef<any[]>([])
  const lastNodeIdRef = useRef<string>('')
  const nodeIndexRef = useRef<number>(0)
  // 本轮 Agent 追加的节点 id 栈（用于自愈式回退删除）
  const appendedStackRef = useRef<string[]>([])

  // ── 画布操作（保留在 panel，依赖 React Flow）──────────────────────────────
  const prepareCanvas = useCallback(() => {
    let baseNodes: any[] = []
    let baseEdges: any[] = []
    let startNodeId = ''

    if (isOverwrite) {
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
    appendedStackRef.current = [] // 新一轮规划，清空回退栈

    setRfNodes(baseNodes)
    setRfEdges(baseEdges)
  }, [isOverwrite, rfNodes, rfEdges, setRfNodes, setRfEdges])

  const appendNodeToCanvas = useCallback(
    (step: { type: string; label: string; params: any }) => {
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
      appendedStackRef.current.push(nodeId) // 记录以便回退删除

      setRfNodes(nextNodes)
      setRfEdges(nextEdges)

      setTimeout(() => fitView({ duration: 300, padding: 0.2 }), 50)
    },
    [setRfNodes, setRfEdges, fitView]
  )

  // 删除本轮 Agent 最近追加的 N 个节点（自愈式回退：上一步没达预期就撤销重规划）
  const removeLastNodes = useCallback(
    (count: number): number => {
      let removed = 0
      for (let i = 0; i < count; i++) {
        const nodeId = appendedStackRef.current.pop()
        if (!nodeId) break // 没有可回退的 Agent 节点（不删用户/触发器节点）

        const nodes = currentNodesRef.current.filter((n) => n.id !== nodeId)
        const edges = currentEdgesRef.current.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        )
        currentNodesRef.current = nodes
        currentEdgesRef.current = edges
        nodeIndexRef.current = Math.max(0, nodeIndexRef.current - 1)
        removed++
      }
      // 回退后把锚点指向新的末端节点
      lastNodeIdRef.current =
        appendedStackRef.current[appendedStackRef.current.length - 1] ??
        currentNodesRef.current.find((n) => n.type === 'trigger-manual')?.id ??
        currentNodesRef.current[currentNodesRef.current.length - 1]?.id ??
        ''

      setRfNodes([...currentNodesRef.current])
      setRfEdges([...currentEdgesRef.current])
      setTimeout(() => fitView({ duration: 300, padding: 0.2 }), 50)
      return removed
    },
    [setRfNodes, setRfEdges, fitView]
  )

  // ── Agent hook 接线 ───────────────────────────────────────────────────────
  const { messages, isGenerating, send, stop, clear } = useAgent({
    deps: {
      getDeviceId: () => selectedDeviceId,
      // 实机交互不再由开关控制：连接了设备即视为实机模式
      isInteractive: () => !!selectedDeviceId,
      getBaseUrl,
      appendNode: appendNodeToCanvas,
      removeLastNodes,
      clearCanvas: prepareCanvas
    }
  })

  // 滚动到底部
  useEffect(() => {
    const t = setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    return () => clearTimeout(t)
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = prompt.trim()
    if (!text || isGenerating) return
    prepareCanvas() // 每次生成前同步画布锚点
    setPrompt('')
    void send(text)
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
            onClick={clear}
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
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              msg={msg}
              isReasoningExpanded={isReasoningExpanded}
              onToggleReasoning={() => setIsReasoningExpanded((v) => !v)}
            />
          ))}
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
        <div className="flex items-center justify-end px-0.5">
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
          onSubmit={handleSubmit}
          className="flex items-center gap-2 relative bg-muted/50 border border-border/60 rounded-xl p-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all"
        >
          <input
            className="flex-1 bg-transparent border-0 outline-none ring-0 placeholder:text-muted-foreground/60 text-xs px-2 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              !activeWorkflowId
                ? '请先在左侧选择或创建一个工作流'
                : '输入想要规划测试的目标，如"在微信里截图"'
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
              onClick={stop}
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

// PLACEHOLDER_BUBBLE

// ── 单条消息气泡 ────────────────────────────────────────────────────────────
function ChatBubble({
  msg,
  isReasoningExpanded,
  onToggleReasoning
}: {
  msg: ChatMessage
  isReasoningExpanded: boolean
  onToggleReasoning: () => void
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
    >
      {/* 发送人 */}
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

      {/* 气泡 */}
      <div
        className={`relative p-3 rounded-2xl text-xs w-[300px] min-w-0 overflow-hidden shadow-sm transition-all leading-relaxed ${
          msg.role === 'user'
            ? 'whitespace-pre-wrap break-all bg-primary text-primary-foreground rounded-tr-none'
            : 'bg-card/75 border border-border/50 rounded-tl-none text-foreground'
        }`}
      >
        {/* 思维链 */}
        {msg.reasoning && (
          <div className="mb-2 bg-indigo-500/5 rounded-r-lg">
            <button
              type="button"
              onClick={onToggleReasoning}
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
              <div className="px-2 pb-2 text-[10px] font-mono text-muted-foreground/90 max-h-[200px] overflow-y-auto leading-relaxed border-t border-indigo-500/10 prose prose-xs dark:prose-invert max-w-none [&_p]:my-0.5 [&_p]:text-[10px] [&_code]:text-[9px] [&_code]:bg-indigo-500/10 [&_code]:text-indigo-300 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_strong]:text-indigo-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.reasoning}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* 正文 */}
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

        {/* 工具调用 */}
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="mt-3.5 pt-2.5 border-t border-border/40 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Terminal className="w-3 h-3" />
              工具调用动作序列：
            </p>
            <div className="space-y-1.5">
              {msg.toolCalls.map((tc) => (
                <ToolCallCard key={tc.id} tc={tc} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── 工具分类的视觉样式（按 category 区分 Agent 在"查资料/感知/动手"）──────────
const TOOL_CATEGORY_STYLE: Record<string, { icon: React.ReactNode; label: string; tint: string }> = {
  meta: {
    icon: <BookOpen className="w-3 h-3 shrink-0" />,
    label: '技能/管理',
    tint: 'text-violet-500'
  },
  perception: {
    icon: <Eye className="w-3 h-3 shrink-0" />,
    label: '设备感知',
    tint: 'text-sky-500'
  },
  canvas: {
    icon: <WorkflowIcon className="w-3 h-3 shrink-0" />,
    label: '画布动作',
    tint: 'text-emerald-500'
  }
}

// ── 单个工具调用卡片 ────────────────────────────────────────────────────────
function ToolCallCard({ tc }: { tc: ToolCallState }): React.JSX.Element {
  const isPending = tc.status === 'pending'
  const isSuccess = tc.status === 'success'
  const catStyle = tc.category ? TOOL_CATEGORY_STYLE[tc.category] : undefined

  return (
    <div className="rounded-lg border bg-muted/20 border-border/50 p-2 text-[11px] font-mono space-y-1 overflow-hidden min-w-0">
      <div className="flex items-center justify-between gap-1 min-w-0">
        <span className="font-semibold text-foreground/90 flex items-center gap-1.5 truncate min-w-0">
          {/* 分类图标，帮助一眼区分 Agent 在做什么 */}
          {catStyle && <span className={catStyle.tint}>{catStyle.icon}</span>}
          <span className="truncate">{tc.name}</span>
        </span>
        <span
          className={`shrink-0 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
            isPending
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              : isSuccess
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
          }`}
        >
          {tc.status}
        </span>
      </div>

      {/* 分类标签 */}
      {catStyle && <div className={`text-[9px] font-medium ${catStyle.tint}`}>{catStyle.label}</div>}

      {/* 参数 */}
      <div className="text-[10px] text-muted-foreground overflow-hidden" title={tc.arguments}>
        参数: <span className="text-blue-500 break-all">{tc.arguments}</span>
      </div>

      {/* 截图预览 */}
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
}
