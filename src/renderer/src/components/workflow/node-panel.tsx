import { useCallback, useState } from 'react'
import { nanoid } from 'nanoid'
import { motion, AnimatePresence } from 'motion/react'
import type { WorkflowNodeType } from '../../../../shared/workflow'
import { useWorkflowStore } from '@/stores/workflow'
import { useReactFlow } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Play, Camera, MousePointerClick, MoveVertical, Keyboard,
  Package, Trash2, Terminal, BookOpen, Pencil, Square, ScanText,
  GitBranch, Repeat, Timer,
  GripVertical, PanelLeftOpen, PanelLeftClose,
  Hand, Move, Delete, Command,
} from 'lucide-react'

// ── 节点模板类型 ──────────────────────────────────────────────────────────────

interface NodeTemplate {
  type: WorkflowNodeType
  label: string
  icon: React.ReactNode
  description: string
  handleColor: string
}

interface NodeGroup {
  title: string
  items: NodeTemplate[]
}

// ── 颜色样式映射（基于 handleColor） ─────────────────────────────────────────

const COLOR_STYLES: Record<string, { iconBg: string; iconText: string }> = {
  '#10b981': { iconBg: 'bg-emerald-100 dark:bg-emerald-500/10', iconText: 'text-emerald-600 dark:text-emerald-400' },
  '#3b82f6': { iconBg: 'bg-blue-100 dark:bg-blue-500/10',    iconText: 'text-blue-600 dark:text-blue-400' },
  '#8b5cf6': { iconBg: 'bg-violet-100 dark:bg-violet-500/10', iconText: 'text-violet-600 dark:text-violet-400' },
  '#f97316': { iconBg: 'bg-orange-100 dark:bg-orange-500/10', iconText: 'text-orange-600 dark:text-orange-400' },
  '#eab308': { iconBg: 'bg-yellow-100 dark:bg-yellow-500/10', iconText: 'text-yellow-600 dark:text-yellow-400' },
  '#ec4899': { iconBg: 'bg-pink-100 dark:bg-pink-500/10',    iconText: 'text-pink-600 dark:text-pink-400' },
  '#06b6d4': { iconBg: 'bg-cyan-100 dark:bg-cyan-500/10',   iconText: 'text-cyan-600 dark:text-cyan-400' },
}

// ── 节点分组数据 ──────────────────────────────────────────────────────────────

const nodeGroups: NodeGroup[] = [
  {
    title: '触发器',
    items: [
      { type: 'trigger-manual', label: '手动触发', icon: <Play className="w-4 h-4" />, description: '点击运行按钮启动工作流', handleColor: '#10b981' },
    ],
  },
  {
    title: '设备操作',
    items: [
      { type: 'action-tap',        label: '点击',      icon: <MousePointerClick className="w-4 h-4" />, description: '点击屏幕坐标', handleColor: '#3b82f6' },
      { type: 'action-double-tap', label: '双击',      icon: <MousePointerClick className="w-4 h-4" />, description: '双击屏幕坐标', handleColor: '#3b82f6' },
      { type: 'action-long-click', label: '长按',      icon: <Hand className="w-4 h-4" />,              description: '长按屏幕坐标', handleColor: '#3b82f6' },
      { type: 'action-swipe',      label: '滑动',       icon: <MoveVertical className="w-4 h-4" />,      description: '从一点滑动到另一点', handleColor: '#3b82f6' },
      { type: 'action-drag',       label: '拖拽',       icon: <Move className="w-4 h-4" />,              description: '拖拽控件到目标位置', handleColor: '#3b82f6' },
      { type: 'action-input-text', label: '输入文字',   icon: <Keyboard className="w-4 h-4" />,          description: '向焦点控件输入文本', handleColor: '#3b82f6' },
      { type: 'action-clear-text', label: '清除文字',   icon: <Delete className="w-4 h-4" />,            description: '清除焦点控件文字', handleColor: '#3b82f6' },
      { type: 'action-key-event',  label: '按键事件',   icon: <Command className="w-4 h-4" />,           description: '发送系统按键（返回/主屏/任务等）', handleColor: '#3b82f6' },
      { type: 'action-screenshot', label: '截图',       icon: <Camera className="w-4 h-4" />,            description: '截取当前屏幕', handleColor: '#3b82f6' },
    ],
  },
  {
    title: '应用管理',
    items: [
      { type: 'action-install-app',   label: '安装应用',  icon: <Package className="w-4 h-4" />, description: '安装 APK 或 HAP 包', handleColor: '#8b5cf6' },
      { type: 'action-uninstall-app', label: '卸载应用',  icon: <Trash2 className="w-4 h-4" />, description: '卸载指定包名的应用', handleColor: '#8b5cf6' },
      { type: 'action-launch-app',    label: '启动应用',  icon: <Play className="w-4 h-4" />,   description: '热启动或冷启动应用', handleColor: '#8b5cf6' },
      { type: 'action-close-app',     label: '关闭应用',    icon: <Square className="w-4 h-4" />,   description: '强制停止应用进程',    handleColor: '#8b5cf6' },
      { type: 'action-find-and-tap',  label: 'OCR 文字定位', icon: <ScanText className="w-4 h-4" />, description: '识别屏幕文字并点击或输入', handleColor: '#06b6d4' },
      { type: 'action-shell',         label: 'Shell 命令', icon: <Terminal className="w-4 h-4" />, description: '在设备上执行 Shell 命令', handleColor: '#f97316' },
    ],
  },
  {
    title: '变量',
    items: [
      { type: 'action-get-var', label: '读取变量', icon: <BookOpen className="w-4 h-4" />, description: '从全局存储读取变量', handleColor: '#eab308' },
      { type: 'action-set-var', label: '写入变量', icon: <Pencil className="w-4 h-4" />, description: '将值写入全局存储', handleColor: '#eab308' },
    ],
  },
  {
    title: '流程控制',
    items: [
      { type: 'control-if',    label: '条件判断', icon: <GitBranch className="w-4 h-4" />, description: '根据条件走不同分支', handleColor: '#ec4899' },
      { type: 'control-loop',  label: '循环',     icon: <Repeat className="w-4 h-4" />, description: '重复执行 N 次', handleColor: '#ec4899' },
      { type: 'control-delay', label: '延迟等待', icon: <Timer className="w-4 h-4" />, description: '暂停执行指定毫秒数', handleColor: '#ec4899' },
    ],
  },
]

// ── 默认参数 ──────────────────────────────────────────────────────────────────

const DEFAULT_PARAMS: Partial<Record<WorkflowNodeType, Record<string, unknown>>> = {
  'action-tap':          { x: 0, y: 0 },
  'action-double-tap':   { x: 0, y: 0 },
  'action-long-click':   { x: 0, y: 0, duration: 2000 },
  'action-swipe':        { x1: 0, y1: 0, x2: 0, y2: 500, duration: 300 },
  'action-drag':         { x1: 0, y1: 0, x2: 0, y2: 300, duration: 500 },
  'action-input-text':   { text: '' },
  'action-clear-text':   { length: 100 },
  'action-key-event':    { keyCode: 4 },
  'action-screenshot':   { saveToVar: '' },
  'action-install-app':  { packagePath: '' },
  'action-uninstall-app':{ packageName: '' },
  'action-launch-app':   { packageName: '', activity: '', cold: false },
  'action-close-app':     { packageName: '' },
  'action-find-and-tap':  { targetText: '', matchType: 'contains', action: 'tap' },
  'action-shell':        { command: '', saveToVar: '' },
  'action-get-var':      { key: '', saveToVar: '' },
  'action-set-var':      { key: '', value: '' },
  'control-if':          { condition: 'ctx.result === "ok"' },
  'control-loop':        { count: 3 },
  'control-delay':       { ms: 3000 },
}

const totalNodeCount = nodeGroups.reduce((sum, g) => sum + g.items.length, 0)

// ── Node Panel Component ──────────────────────────────────────────────────────

export function NodePanel() {
  const { getViewport } = useReactFlow()
  const { rfNodes, setRfNodes, activeWorkflowId, runStatus } = useWorkflowStore()
  const disabled = runStatus === 'running' || !activeWorkflowId
  const [collapsed, setCollapsed] = useState(false)

  // 点击添加节点
  const addNode = useCallback((template: NodeTemplate) => {
    if (disabled) return
    const { x, y, zoom } = getViewport()
    const position = {
      x: (-x + window.innerWidth / 2 - 90) / zoom,
      y: (-y + window.innerHeight / 2 - 80) / zoom,
    }
    const newNode = {
      id: nanoid(),
      type: template.type as string,
      position,
      data: {
        label: template.label,
        nodeType: template.type,
        params: { ...(DEFAULT_PARAMS[template.type] ?? {}) },
        postDelayMs: template.type.startsWith('trigger-') ? undefined : 2000,
      },
    }
    setRfNodes([...rfNodes, newNode])
  }, [disabled, getViewport, rfNodes, setRfNodes])

  // 拖拽开始
  const onDragStart = useCallback((event: React.DragEvent, template: NodeTemplate) => {
    if (disabled) {
      event.preventDefault()
      return
    }
    event.dataTransfer.setData('application/reactflow-type', template.type)
    event.dataTransfer.setData('application/reactflow-label', template.label)
    event.dataTransfer.setData('application/reactflow-params', JSON.stringify(DEFAULT_PARAMS[template.type] ?? {}))
    event.dataTransfer.effectAllowed = 'move'
  }, [disabled])

  return (
    <div className="relative flex h-full shrink-0">
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 168, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex h-full flex-col border-r overflow-hidden"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
              <span className="text-xs font-semibold">节点操作</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">收起节点面板</TooltipContent>
              </Tooltip>
            </div>

            {/* 节点分组 */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="py-2">
                {nodeGroups.map((group) => (
                  <div key={group.title} className="mb-1">
                    <div className="px-3 py-1">
                      <span className="text-xs font-medium">{group.title}</span>
                    </div>
                    <div className="mx-2 space-y-0.5 mr-3">
                      {group.items.map((template) => {
                        const color = COLOR_STYLES[template.handleColor]
                        return (
                          <button
                            key={template.type}
                            type="button"
                            draggable
                            onClick={() => addNode(template)}
                            onDragStart={(e) => onDragStart(e, template)}
                            disabled={disabled}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-accent cursor-grab active:cursor-grabbing transition-colors group/item',
                              'disabled:opacity-40 disabled:cursor-not-allowed'
                            )}
                            title={template.description}
                          >
                            <div className={cn('flex size-6 shrink-0 items-center justify-center rounded-lg', color.iconBg)}>
                              <span className={color.iconText}>{template.icon}</span>
                            </div>
                            <p className="flex-1 truncate text-xs font-medium leading-none">{template.label}</p>
                            <GripVertical className="size-3.5 text-muted-foreground/40 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* 底部提示 */}
            <div className="border-t px-3 py-2 shrink-0">
              <p className="text-[10px] text-muted-foreground text-center">
                拖拽或点击节点添加到画布
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 收起时悬浮展开按钮 */}
      {collapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="absolute left-2 top-2 z-10 flex items-center justify-center w-7 h-7 bg-card border rounded-md shadow-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">展开节点面板</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
