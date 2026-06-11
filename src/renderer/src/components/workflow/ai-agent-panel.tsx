import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import { useReactFlow } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import {
  Sparkles, X, Bot, Loader2, CheckCircle2,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'

import {
  getAiApiKey,
  getAiBaseUrl,
  getAiModel,
} from '@/lib/settings'
import { useWorkflowStore } from '@/stores/workflow'

// ── 预设用例 ─────────────────────────────────────────────────────────────
const PRESET_EXAMPLES = [
  {
    title: '启动微信并截图',
    prompt: '冷启动微信（包名 com.tencent.wechat），等待5秒加载，然后截取当前屏幕，最后返回主屏幕。'
  }
]

// ── LLM 系统提示词 ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `你是一个自动化测试和工作流编排专家，正在帮助用户根据测试用例生成自动化工作流方案。
你的任务是将用户的自然语言用例描述转化为一系列的自动化工作流步骤。

可用步骤节点类型及参数规范如下：
1. 启动应用 (type: 'action-launch-app')
   参数: { "packageName": "包名", "cold": true|false }
2. 关闭应用 (type: 'action-close-app')
   参数: { "packageName": "包名" }
3. 点击坐标 (type: 'action-tap')
   参数: { "x": 数字, "y": 数字 }
4. 双击坐标 (type: 'action-double-tap')
   参数: { "x": 数字, "y": 数字 }
5. 长按坐标 (type: 'action-long-click')
   参数: { "x": 数字, "y": 数字, "duration": 数字(毫秒，默认2000) }
6. 滑动屏幕 (type: 'action-swipe')
   参数: { "x1": 数字, "y1": 数字, "x2": 数字, "y2": 数字, "duration": 毫秒数 }
7. 拖拽控件 (type: 'action-drag')
   参数: { "x1": 数字, "y1": 数字, "x2": 数字, "y2": 数字, "duration": 毫秒数 }
8. 输入文字 (type: 'action-input-text')
   参数: { "text": "要输入的文字", "x": 聚焦X坐标(可选), "y": 聚焦Y坐标(可选) }
9. 清除文字 (type: 'action-clear-text')
   参数: { "length": 数字(可选，默认100) }
10. 按键事件 (type: 'action-key-event')
    参数: { "keyCode": 数字 } (常用KeyCode: 4=返回, 3=主屏幕, 187=最近任务, 66=回车, 67=删除)
11. 截图 (type: 'action-screenshot')
    参数: { "saveToVar": "保存到变量名(可选)" }
12. OCR文字定位与点击 (type: 'action-find-and-tap')
    参数: { "targetText": "定位文字", "matchType": "contains"|"equals"|"startsWith"|"endsWith"|"regex", "action": "tap"|"doubleTap"|"longPress"|"input"|"assert", "text": "输入内容(action为input时必填)" }
13. 执行Shell命令 (type: 'action-shell')
    参数: { "command": "shell命令", "saveToVar": "保存到变量名(可选)" }
14. 读取变量 (type: 'action-get-var')
    参数: { "key": "变量键名", "saveToVar": "存储变量名" }
15. 写入变量 (type: 'action-set-var')
    参数: { "key": "全局变量键", "value": "值(可模板引用 {{var}})" }
16. 条件判断 (type: 'control-if')
    参数: { "condition": "JS条件表达式" }
17. 循环 (type: 'control-loop')
    参数: { "count": 数字 }
18. 延迟等待 (type: 'control-delay')
    参数: { "ms": 毫秒数 }

输出格式规范：
- 你可以用中文流式输出你的思考过程（Thinking），直接以纯文本输出（一行一个想法，不要带 markdown 代码块）。
- 每一个需要生成的自动化步骤节点，必须以单行格式输出，且必须以 \`[STEP]\` 为前缀，后接一个完整的单行 JSON 对象，其属性包含：
  - "type": 对应上方的节点类型。
  - "label": 该步骤的简短中文名称（展示在画布节点标题上）。
  - "params": 对应的参数对象。
  - 示例格式：\`[STEP] {"type": "action-launch-app", "label": "启动微信", "params": {"packageName": "com.tencent.mm", "cold": true}}\`
  - 示例格式：\`[STEP] {"type": "control-delay", "label": "等待加载", "params": {"ms": 3000}}\`
- 请严格确保每行只有一个 \`[STEP]\` JSON 串，且不要有任何换行符在 JSON 里面。
- 如果用户没有指定包名或精确坐标，你可以根据经验推测一个合理的默认值（例如：微信 \`com.tencent.mm\`，淘宝 \`com.taobao.taobao\`，拼多多 \`com.xunmeng.pinduoduo\`，坐标在没有具体上下文时，可先放一个示意坐标，并在思考过程中提醒用户后续在画布中微调或通过设备投屏重新拾取）。

现在，请根据用户的输入用例需求，开始生成自动化方案。`

interface AiAgentPanelProps {
  onClose: () => void
}

export function AiAgentPanel({ onClose }: AiAgentPanelProps): React.JSX.Element {
  const { fitView } = useReactFlow()
  const { rfNodes, rfEdges, setRfNodes, setRfEdges, activeWorkflowId } = useWorkflowStore()

  // ── 状态管理 ─────────────────────────────────────────────────────────────
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [thinkingLogs, setThinkingLogs] = useState<string[]>([])
  const [parsedSteps, setParsedSteps] = useState<any[]>([])
  const [isOverwrite, setIsOverwrite] = useState(true) // 默认覆盖当前工作流

  const abortControllerRef = useRef<AbortController | null>(null)
  const thinkingEndRef = useRef<HTMLDivElement>(null)

  // ── 滚动到底部 ───────────────────────────────────────────────────────────
  useEffect(() => {
    thinkingEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thinkingLogs])

  // ── 动态在 React Flow Canvas 中添加节点 ────────────────────────────────────
  // 我们在流式执行过程中，逐步构建节点链条。
  const currentNodesRef = useRef<any[]>([])
  const currentEdgesRef = useRef<any[]>([])
  const lastNodeIdRef = useRef<string>('')
  const nodeIndexRef = useRef<number>(0)

  // 初始化画布状态
  const prepareCanvas = useCallback(() => {
    let baseNodes: any[] = []
    let baseEdges: any[] = []
    let startNodeId = ''

    if (isOverwrite) {
      // 覆盖模式：清空除手动触发（或者新建一个）外的所有节点
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
      // 追加模式：保留当前画布，找到最后一个节点
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
        // 查找没有出度边的节点（通常是最后一个节点）
        const sourceNodes = new Set(baseEdges.map(e => e.source))
        const leafNodes = baseNodes.filter(n => !sourceNodes.has(n.id))
        
        if (leafNodes.length > 0) {
          // 挑选 X 坐标最大的作为追加起点
          const lastNode = leafNodes.reduce((max, node) => node.position.x > max.position.x ? node : max, leafNodes[0])
          startNodeId = lastNode.id
          // 估算 index 偏置
          nodeIndexRef.current = Math.round((lastNode.position.x - 200) / 260)
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

  // 追加一个新步骤到画布
  const appendNodeToCanvas = useCallback((step: { type: string; label: string; params: any }) => {
    nodeIndexRef.current++
    const nodeId = nanoid()
    
    // 计算新节点的位置 (水平排布)
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

    // 建立与上一节点的边连接
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

    // 让画布跟随最新生成的节点进行平滑缩放聚焦
    setTimeout(() => {
      fitView({ duration: 300, padding: 0.2 })
    }, 50)
  }, [setRfNodes, setRfEdges, fitView])

  // ── 发送请求 & 流式生成 ──────────────────────────────────────────────────
  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      toast.error('请输入用例需求描述')
      return
    }

    const apiKey = getAiApiKey()
    if (!apiKey) {
      toast.error('请先配置 AI API Key')
      return
    }

    setIsGenerating(true)
    setThinkingLogs([])
    setParsedSteps([])

    // 初始化画布状态
    prepareCanvas()

    abortControllerRef.current = new AbortController()

    try {
      const activeUrl = getAiBaseUrl()
      const activeModel = getAiModel()

      const response = await fetch(`${activeUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: activeModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: trimmedPrompt }
          ],
          stream: true
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`请求失败 (${response.status}): ${errorText || response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('未获取到流读取器')
      }

      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let fullText = ''
      let processedLineCount = 0

      // 解析单行流式内容
      const processLine = (rawLine: string) => {
        const line = rawLine.trim()
        if (!line) return

        // 匹配 [STEP] 后面的 JSON
        const stepMatch = line.match(/^\[STEP\]\s*(\{.*\})$/)
        if (stepMatch) {
          try {
            const step = JSON.parse(stepMatch[1])
            if (step && step.type) {
              setParsedSteps(prev => [...prev, step])
              appendNodeToCanvas(step)
            }
          } catch (e) {
            console.error('解析步骤 JSON 错误:', e, line)
            setThinkingLogs(prev => [...prev, `[步骤解析错误] ${line}`])
          }
        } else {
          // 普通日志输出
          setThinkingLogs(prev => [...prev, line])
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          if (trimmed === 'data: [DONE]') continue

          if (trimmed.startsWith('data: ')) {
            try {
              const jsonStr = trimmed.slice(6)
              const parsed = JSON.parse(jsonStr)
              const content = parsed.choices?.[0]?.delta?.content || ''
              if (content) {
                fullText += content
                
                // 处理已完成输出的完整行
                const subLines = fullText.split('\n')
                while (processedLineCount < subLines.length - 1) {
                  processLine(subLines[processedLineCount])
                  processedLineCount++
                }
              }
            } catch (e) {
              // 忽略不完整 JSON 的解析错误
            }
          }
        }
      }

      // 处理最后未换行的内容
      const finalLines = fullText.split('\n')
      if (processedLineCount < finalLines.length) {
        processLine(finalLines[processedLineCount])
      }

      toast.success('工作流编排生成完成！')
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('生成已被用户停止')
      } else {
        console.error(error)
        toast.error(`生成出错: ${error.message || error}`)
        setThinkingLogs(prev => [...prev, `❌ 出错: ${error.message || error}`])
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  // 停止生成
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute top-0 right-0 bottom-0 w-[280px] bg-card/95 backdrop-blur-md flex flex-col z-50 shadow-sm"
    >
      {/* ── 头部 ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-semibold">智能流式编排</h3>
            <p className="text-[10px] text-muted-foreground">根据用例需求自动生成自动化节点</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg text-muted-foreground"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── 主内容区 ─────────────────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 flex flex-col gap-3">
          {/* 用例描述输入 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>用例需求描述</span>
              <span className="text-[10px] text-muted-foreground/60">支持中文描述，如点击、等待、截图等</span>
            </p>
            <Textarea
              className="!text-xs h-24 placeholder:!text-xs resize-none"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={'请输入测试用例需求。例如：\n冷启动微信，等待5秒，OCR查找文本\u201C发现\u201D并点击，点击\u201C小程序\u201D按钮，截图，最后返回主屏。'}
              disabled={isGenerating}
            />

            {/* 生成模式切换 */}
            <div className="flex items-center gap-3 pt-1.5">
              <span className="text-[11px] text-muted-foreground font-medium shrink-0">生成模式</span>
              <div className="relative flex rounded-md bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => !isGenerating && setIsOverwrite(true)}
                  disabled={isGenerating}
                  className={`relative z-10 px-3 py-1 text-[11px] rounded-sm font-medium transition-colors ${
                    isOverwrite
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  覆盖当前
                </button>
                <button
                  type="button"
                  onClick={() => !isGenerating && setIsOverwrite(false)}
                  disabled={isGenerating}
                  className={`relative z-10 px-3 py-1 text-[11px] rounded-sm font-medium transition-colors ${
                    !isOverwrite
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  追加到末尾
                </button>
              </div>
            </div>
          </div>

          {/* 预设用例快速填入 */}
          {!isGenerating && parsedSteps.length === 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">预设用例快速尝试</span>
              <div className="flex flex-col gap-1.5">
                {PRESET_EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPrompt(ex.prompt)}
                    className="flex items-start gap-2 text-left text-[11px] p-2 rounded-lg bg-muted/40 border hover:bg-muted border-border/50 hover:border-primary/30 transition-all group"
                  >
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-primary">{ex.title}</p>
                      <p className="text-muted-foreground/80 line-clamp-1 mt-0.5">{ex.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 过程展示 */}
          {(isGenerating || thinkingLogs.length > 0 || parsedSteps.length > 0) && (
            <div className="flex flex-col gap-3">
              {/* AI 思考日志 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                    AI 思考轨迹
                  </span>
                  {isGenerating && (
                    <span className="flex items-center gap-1 text-[10px] text-primary font-mono font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      思考中...
                    </span>
                  )}
                </div>
                <div className="h-[200px] rounded-lg bg-black/5 dark:bg-black/20 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-3 font-mono text-[11px] leading-relaxed space-y-1">
                      {thinkingLogs.length === 0 ? (
                        <p className="text-muted-foreground/50 italic">等待大模型开始输出...</p>
                      ) : (
                        thinkingLogs.map((log, index) => (
                          <div key={index} className="text-muted-foreground break-all">
                            {log}
                          </div>
                        ))
                      )}
                      <div ref={thinkingEndRef} />
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* 已生成的步骤卡片列表 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    提取的步骤 ({parsedSteps.length})
                  </span>
                </div>
                {parsedSteps.length === 0 ? (
                  <div className="h-16 flex items-center justify-center text-[11px] text-muted-foreground/50 italic">
                    暂无解析步骤，请开始生成
                  </div>
                ) : (
                  parsedSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 border rounded-lg p-1.5 text-xs bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="w-5 h-5 rounded flex items-center justify-center bg-primary/10 text-primary font-bold font-mono text-[10px]">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-[11px]">{step.label}</p>
                        <p className="text-[9px] text-muted-foreground truncate font-mono">{step.type}</p>
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── 底部控制 ─────────────────────────────────────────────────────────── */}
      <div className="py-2 px-3.5 flex items-center justify-between gap-3">
        {!isGenerating ? (
          <Button
            onClick={handleGenerate}
            disabled={!activeWorkflowId}
            size="sm"
            className="w-full"
          >
            <Sparkles className="w-4 h-4" />
            AI 生成工作流
          </Button>
        ) : (
          <Button
            onClick={handleStop}
            variant="destructive"
            size="sm"
            className="w-full"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            停止生成
          </Button>
        )}
      </div>
    </motion.div>
  )
}
