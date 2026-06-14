import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
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
  Compass,
  Target,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useWorkflowStore } from '@/stores/workflow'
import { useAgent, type ChatMessage, type SubGoalDisplay } from '@/agent/use-agent'

// ── 预设用例 ─────────────────────────────────────────────────────────────
const PRESET_EXAMPLES = [
  {
    title: '启动微信并截图',
    prompt:
      '冷启动微信（com.tencent.wechat），等待5秒加载，然后截取当前屏幕，最后返回主屏幕。',
  },
  {
    title: '打开文心切换到我的页面',
    prompt:
      '冷启动文心APP，点击左上角返回图标按钮，底部切换我的Tab，确认我的页面有去创作按钮，截图',
  },
]

// ── 组件 ─────────────────────────────────────────────────────────────────

interface AiAgentPanelProps {
  onClose: () => void
}

export function AiAgentPanel({ onClose }: AiAgentPanelProps): React.JSX.Element {
  const {
    messages,
    isGenerating,
    isOverwrite,
    isInteractive,
    subGoals,
    setIsOverwrite,
    setIsInteractive,
    send,
    abort,
    clearChat,
  } = useAgent()

  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId)

  const [prompt, setPrompt] = useState('')
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 80)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // ── 提交 ─────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const inputPrompt = prompt.trim()
    if (!inputPrompt || isGenerating) return
    setPrompt('')
    void send(inputPrompt)
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
            onClick={clearChat}
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

      {/* ── 子目标进度 ────────────────────────────────────────────────────── */}
      {subGoals.length > 0 && (
        <div className="px-4 py-2 shrink-0 border-b border-border/30 bg-background/50">
          <SubGoalProgress goals={subGoals} />
        </div>
      )}

      {/* ── 消息流主区域 ────────────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0 bg-background/30 p-4 rounded-t-lg border-t">
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {messages
              .filter((m) => m.role !== 'system' && m.role !== 'tool')
              .map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isReasoningExpanded={isReasoningExpanded}
                  onToggleReasoning={() => setIsReasoningExpanded(!isReasoningExpanded)}
                />
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
              onClick={abort}
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

// ── 消息气泡子组件 ──────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: ChatMessage
  isReasoningExpanded: boolean
  onToggleReasoning: () => void
}

function MessageBubble({ msg, isReasoningExpanded, onToggleReasoning }: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
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
        className={`relative p-3 rounded-2xl text-xs w-[300px] min-w-0 overflow-hidden shadow-sm transition-all leading-relaxed ${
          msg.role === 'user'
            ? 'whitespace-pre-wrap break-all bg-primary text-primary-foreground rounded-tr-none'
            : 'bg-card/75 border border-border/50 rounded-tl-none text-foreground'
        }`}
      >
        {/* 思维链展示 */}
        {msg.reasoning && (
          <ReasoningBlock
            reasoning={msg.reasoning}
            isThinking={msg.isThinking ?? false}
            isExpanded={isReasoningExpanded}
            onToggle={onToggleReasoning}
          />
        )}

        {/* 消息文本内容 */}
        {msg.content ? (
          msg.role === 'user' ? (
            <div className="break-words font-medium">{msg.content}</div>
          ) : (
            <div className="agent-markdown break-words text-xs leading-relaxed">
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
          <ToolCallsBlock toolCalls={msg.toolCalls} />
        )}
      </div>
    </motion.div>
  )
}

// ── 思维链子组件 ────────────────────────────────────────────────────────

interface ReasoningBlockProps {
  reasoning: string
  isThinking: boolean
  isExpanded: boolean
  onToggle: () => void
}

function ReasoningBlock({ reasoning, isThinking, isExpanded, onToggle }: ReasoningBlockProps) {
  return (
    <div className="mb-2 bg-indigo-500/5 rounded-r-lg">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-[10px] font-mono text-indigo-400 px-2 py-1 hover:bg-indigo-500/10 rounded-tr-lg"
      >
        <span className="flex items-center gap-1">
          <Cpu className={`w-3.5 h-3.5 ${isThinking ? 'animate-spin' : ''}`} />
          {isThinking ? '正在思考中...' : '思考探索链路'}
        </span>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {isExpanded && (
        <div className="px-2 pb-2 text-[10px] font-mono text-muted-foreground/90 max-h-[200px] overflow-y-auto leading-relaxed border-t border-indigo-500/10">
          {reasoning}
        </div>
      )}
    </div>
  )
}

// ── 工具调用子组件 ──────────────────────────────────────────────────────

interface ToolCallsBlockProps {
  toolCalls: ChatMessage['toolCalls']
}

function ToolCallsBlock({ toolCalls }: ToolCallsBlockProps) {
  if (!toolCalls || toolCalls.length === 0) return null

  return (
    <div className="mt-3.5 pt-2.5 border-t border-border/40 space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
        <Terminal className="w-3 h-3" />
        工具调用动作序列：
      </p>
      <div className="space-y-1.5">
        {toolCalls.map((tc) => (
          <ToolCallItem key={tc.id} tc={tc} />
        ))}
      </div>
    </div>
  )
}

interface ToolCallItemProps {
  tc: NonNullable<ChatMessage['toolCalls']>[number]
}

function ToolCallItem({ tc }: ToolCallItemProps) {
  const isPending = tc.status === 'pending'
  const isSuccess = tc.status === 'success'

  return (
    <div className="rounded-lg border bg-muted/20 border-border/50 p-2 text-[11px] font-mono space-y-1 overflow-hidden min-w-0">
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

      {/* 工具参数简要渲染 */}
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

// ── 子目标进度子组件 ───────────────────────────────────────────────────

interface SubGoalProgressProps {
  goals: SubGoalDisplay[]
}

function SubGoalProgress({ goals }: SubGoalProgressProps) {
  const finished = goals.filter((g) => g.status === 'finished').length
  const total = goals.length

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
          <Target className="w-3 h-3 text-primary" />
          子目标进度
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {finished}/{total}
        </span>
      </div>

      {/* 进度条 */}
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/70 rounded-full transition-all duration-500"
          style={{ width: total > 0 ? `${(finished / total) * 100}%` : '0%' }}
        />
      </div>

      {/* 目标列表 */}
      <div className="space-y-0.5 mt-1">
        {goals.map((g) => (
          <div
            key={g.index}
            className={`flex items-center gap-1.5 text-[10px] font-mono transition-colors ${
              g.status === 'finished'
                ? 'text-emerald-500'
                : g.status === 'running'
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground/60'
            }`}
          >
            {g.status === 'finished' ? (
              <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
            ) : g.status === 'running' ? (
              <Loader2 className="w-2.5 h-2.5 shrink-0 animate-spin" />
            ) : (
              <div className="w-2.5 h-2.5 shrink-0 rounded-full border border-muted-foreground/30" />
            )}
            <span className="truncate">{g.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
