import { nanoid } from 'nanoid'
import type { WorkflowNodeType } from '../../../../shared/workflow'
import { useWorkflowStore } from '@/stores/workflow'
import { useReactFlow } from '@xyflow/react'
import { cn } from '@/lib/utils'
import {
  Play, Camera, MousePointerClick, MoveVertical, Keyboard,
  Package, Trash2, Terminal, BookOpen, Pencil,
  GitBranch, Repeat, Timer
} from 'lucide-react'

interface NodeCategory {
  title: string
  nodes: { type: WorkflowNodeType; label: string; icon: React.ReactNode; description: string }[]
}

const CATEGORIES: NodeCategory[] = [
  {
    title: '触发器',
    nodes: [
      { type: 'trigger-manual', label: '手动触发', icon: <Play className="w-4 h-4" />, description: '点击运行按钮启动工作流' },
    ],
  },
  {
    title: '设备操作',
    nodes: [
      { type: 'action-tap',        label: '点击',      icon: <MousePointerClick className="w-4 h-4" />, description: '点击屏幕坐标' },
      { type: 'action-swipe',      label: '滑动',       icon: <MoveVertical className="w-4 h-4" />, description: '从一点滑动到另一点' },
      { type: 'action-input-text', label: '输入文字',   icon: <Keyboard className="w-4 h-4" />, description: '向焦点控件输入文本' },
      { type: 'action-screenshot', label: '截图',       icon: <Camera className="w-4 h-4" />, description: '截取当前屏幕' },
    ],
  },
  {
    title: '应用管理',
    nodes: [
      { type: 'action-install-app',   label: '安装应用',  icon: <Package className="w-4 h-4" />, description: '安装 APK 或 HAP 包' },
      { type: 'action-uninstall-app', label: '卸载应用',  icon: <Trash2 className="w-4 h-4" />, description: '卸载指定包名的应用' },
      { type: 'action-shell',         label: 'Shell 命令', icon: <Terminal className="w-4 h-4" />, description: '在设备上执行 Shell 命令' },
    ],
  },
  {
    title: '变量',
    nodes: [
      { type: 'action-get-var', label: '读取变量', icon: <BookOpen className="w-4 h-4" />, description: '从全局存储读取变量' },
      { type: 'action-set-var', label: '写入变量', icon: <Pencil className="w-4 h-4" />, description: '将值写入全局存储' },
    ],
  },
  {
    title: '流程控制',
    nodes: [
      { type: 'control-if',    label: '条件判断', icon: <GitBranch className="w-4 h-4" />,  description: '根据条件走不同分支' },
      { type: 'control-loop',  label: '循环',     icon: <Repeat className="w-4 h-4" />, description: '重复执行 N 次' },
      { type: 'control-delay', label: '延迟等待', icon: <Timer className="w-4 h-4" />, description: '暂停执行指定毫秒数' },
    ],
  },
]

const DEFAULT_PARAMS: Partial<Record<WorkflowNodeType, Record<string, unknown>>> = {
  'action-tap':          { x: 0, y: 0 },
  'action-swipe':        { x1: 0, y1: 0, x2: 0, y2: 500, duration: 300 },
  'action-input-text':   { text: '' },
  'action-screenshot':   { saveToVar: '' },
  'action-install-app':  { packagePath: '' },
  'action-uninstall-app':{ packageName: '' },
  'action-shell':        { command: '', saveToVar: '' },
  'action-get-var':      { key: '', saveToVar: '' },
  'action-set-var':      { key: '', value: '' },
  'control-if':          { condition: 'ctx.result === "ok"' },
  'control-loop':        { count: 3 },
  'control-delay':       { ms: 1000 },
}

export function NodePanel() {
  const { getViewport } = useReactFlow()
  const { rfNodes, setRfNodes, activeWorkflowId, runStatus } = useWorkflowStore()
  const disabled = runStatus === 'running' || !activeWorkflowId

  function addNode(type: WorkflowNodeType, label: string) {
    if (disabled) return
    const { x, y, zoom } = getViewport()
    // 放置在画布可见区域中心偏上
    const position = {
      x: (-x + window.innerWidth / 2 - 90) / zoom,
      y: (-y + window.innerHeight / 2 - 80) / zoom,
    }
    const newNode = {
      id: nanoid(),
      type,
      position,
      data: {
        label,
        nodeType: type,
        params: { ...(DEFAULT_PARAMS[type] ?? {}) },
      },
    }
    setRfNodes([...rfNodes, newNode])
  }

  return (
    <div className="w-52 shrink-0 flex flex-col bg-card border-r border-border overflow-y-auto">
      <div className="px-3 py-2.5 border-b border-border">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">节点面板</h3>
      </div>

      <div className="flex-1 px-2 py-2 space-y-3 overflow-y-auto">
        {CATEGORIES.map((cat) => (
          <div key={cat.title}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1.5">
              {cat.title}
            </p>
            <div className="space-y-1">
              {cat.nodes.map((n) => (
                <button
                  key={n.type}
                  title={n.description}
                  disabled={disabled}
                  onClick={() => addNode(n.type, n.label)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all text-sm',
                    'border border-transparent hover:border-border hover:bg-accent',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  <span className="text-base leading-none w-5 text-center">{n.icon}</span>
                  <span className="font-medium text-[12px]">{n.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
