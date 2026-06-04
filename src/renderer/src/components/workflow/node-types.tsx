import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { useWorkflowStore } from '@/stores/workflow'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Play, Camera, MousePointerClick, MoveVertical, Keyboard,
  Package, Trash2, Terminal, BookOpen, Pencil, Square,
  GitBranch, Repeat, Timer,
  CheckCircle2, AlertCircle, Loader2,
  Hand, Move, Delete, Command,
} from 'lucide-react'

// ── 节点元数据 ─────────────────────────────────────────────────────────────

const NODE_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  'trigger-manual':       { label: '手动触发',   icon: <Play className="w-3.5 h-3.5" />,              color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  'action-screenshot':    { label: '截图',        icon: <Camera className="w-3.5 h-3.5" />,            color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'action-tap':           { label: '点击',        icon: <MousePointerClick className="w-3.5 h-3.5" />, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'action-double-tap':    { label: '双击',        icon: <MousePointerClick className="w-3.5 h-3.5" />, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'action-long-click':    { label: '长按',        icon: <Hand className="w-3.5 h-3.5" />,              color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'action-swipe':         { label: '滑动',        icon: <MoveVertical className="w-3.5 h-3.5" />,      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'action-drag':          { label: '拖拽',        icon: <Move className="w-3.5 h-3.5" />,              color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'action-input-text':    { label: '输入文字',    icon: <Keyboard className="w-3.5 h-3.5" />,          color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'action-clear-text':    { label: '清除文字',    icon: <Delete className="w-3.5 h-3.5" />,            color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'action-key-event':     { label: '按键事件',    icon: <Command className="w-3.5 h-3.5" />,           color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'action-install-app':   { label: '安装应用',    icon: <Package className="w-3.5 h-3.5" />,           color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  'action-uninstall-app': { label: '卸载应用',    icon: <Trash2 className="w-3.5 h-3.5" />,            color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  'action-launch-app':    { label: '启动应用',    icon: <Play className="w-3.5 h-3.5" />,              color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  'action-close-app':     { label: '关闭应用',    icon: <Square className="w-3.5 h-3.5" />,            color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  'action-shell':         { label: 'Shell 命令',  icon: <Terminal className="w-3.5 h-3.5" />,          color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  'action-get-var':       { label: '读取变量',    icon: <BookOpen className="w-3.5 h-3.5" />,          color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  'action-set-var':       { label: '写入变量',    icon: <Pencil className="w-3.5 h-3.5" />,            color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  'control-if':           { label: '条件判断',    icon: <GitBranch className="w-3.5 h-3.5" />,         color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  'control-loop':         { label: '循环',        icon: <Repeat className="w-3.5 h-3.5" />,            color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  'control-delay':        { label: '延迟等待',    icon: <Timer className="w-3.5 h-3.5" />,             color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
}

// ── Base Node Component ───────────────────────────────────────────────────

interface WorkflowNodeData {
  label: string
  nodeType: string
  params: Record<string, unknown>
  stepStatus?: 'running' | 'success' | 'error'
}

function BaseNode({
  id,
  data,
  children,
  hasInput = true,
  hasOutput = true,
  outputHandles,
}: {
  id: string
  data: WorkflowNodeData
  children?: React.ReactNode
  hasInput?: boolean
  hasOutput?: boolean
  outputHandles?: { id: string; label: string; style?: React.CSSProperties }[]
}) {
  const meta = NODE_META[data.nodeType] ?? { label: data.nodeType, icon: <div />, color: '#888', bg: 'rgba(136,136,136,0.1)' }
  const { selectedNodeId } = useWorkflowStore()
  const isSelected = selectedNodeId === id
  const status = data.stepStatus

  return (
    <div className={cn('rounded-xl', status === 'running' && 'node-border-running p-px')}>
    <Card
      className={cn(
        'w-[260px] gap-0 py-0 shadow-sm transition-all duration-200 overflow-hidden',
        isSelected && !status && 'ring-primary/50',
        status === 'running' && 'ring-0',
        status === 'success' && 'ring-emerald-500/70 shadow-emerald-500/10 shadow-md',
        status === 'error'   && 'node-error ring-0',
      )}
    >
      {/* Input handle */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !rounded-full !border-2 !border-background hover:!scale-125 transition-transform z-10"
          style={{ backgroundColor: meta.color }}
        />
      )}

      {/* Header — tinted by status */}
      <div className={cn(
        'relative flex items-center gap-2.5 px-3 py-2.5 transition-colors duration-300',
        status === 'running' && 'bg-blue-500/5',
        status === 'success' && 'bg-emerald-500/5',
        status === 'error'   && 'bg-red-500/5',
      )}>
        {/* Success flash overlay */}
        {status === 'success' && (
          <div className="node-success-flash absolute inset-0 bg-emerald-500/15 pointer-events-none" />
        )}

        <div
          className="flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0"
          style={{ backgroundColor: meta.bg, color: meta.color }}
        >
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium leading-tight truncate">{data.label}</p>
          <p className="text-[10px] text-muted-foreground/70 leading-none mt-0.5">{meta.label}</p>
        </div>
        <div className="flex-shrink-0">
          {status === 'running' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {status === 'error'   && <AlertCircle className="w-4 h-4 text-red-500" />}
        </div>
      </div>

      {/* Params area */}
      {children && (
        <div className="px-3 pb-3 flex flex-col gap-2.5 border-t border-border/40 pt-2.5 bg-muted/20">
          {children}
        </div>
      )}

      {/* Output handle(s) */}
      {hasOutput && !outputHandles && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !rounded-full !border-2 !border-background hover:!scale-125 transition-transform z-10"
          style={{ backgroundColor: meta.color }}
        />
      )}
      {outputHandles?.map((h) => (
        <Handle
          key={h.id}
          id={h.id}
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !rounded-full !border-2 !border-background hover:!scale-125 transition-transform z-10"
          style={{ backgroundColor: meta.color, ...h.style }}
        />
      ))}
    </Card>
    </div>
  )
}

// ── Inline Input Helper ───────────────────────────────────────────────────

function NodeInput({
  id, paramKey, label, value, type = 'text', multiline = false, placeholder
}: {
  id: string, paramKey: string, label: string, value?: string | number, type?: string, multiline?: boolean, placeholder?: string
}) {
  const updateNodeParams = useWorkflowStore((s) => s.updateNodeParams)
  const disabled = useWorkflowStore((s) => s.runStatus === 'running')

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </Label>
      {multiline ? (
        <Textarea
          className="nodrag nowheel text-xs font-mono min-h-0 resize-y"
          value={String(value ?? '')}
          disabled={disabled}
          rows={2}
          placeholder={placeholder}
          onChange={(e) => updateNodeParams(id, { [paramKey]: e.target.value })}
        />
      ) : (
        <Input
          type={type}
          className="nodrag h-7 text-xs font-mono"
          value={value ?? ''}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            const val = type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
            updateNodeParams(id, { [paramKey]: val })
          }}
        />
      )}
    </div>
  )
}

// ── Individual Node Components ────────────────────────────────────────────

export const TriggerManualNode = memo(({ id, data }: NodeProps) => (
  <BaseNode id={id} data={data as unknown as WorkflowNodeData} hasInput={false} />
))
TriggerManualNode.displayName = 'TriggerManualNode'

export const ActionScreenshotNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { saveToVar?: string }
  const imageData = useWorkflowStore((s) => s.nodeImages[id])
  const status = d.stepStatus

  return (
    <BaseNode id={id} data={d}>
      <NodeInput id={id} paramKey="saveToVar" label="存入变量" value={p.saveToVar} placeholder="可选" />
      {(imageData || status === 'running') && (
        <div className="rounded-md overflow-hidden border border-border/40 bg-muted/20">
          {imageData ? (
            <img
              src={imageData}
              alt="screenshot"
              className="w-full object-contain max-h-36 block"
            />
          ) : (
            <div className="flex items-center justify-center gap-1.5 h-14 text-[11px] text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              截图中…
            </div>
          )}
        </div>
      )}
    </BaseNode>
  )
})
ActionScreenshotNode.displayName = 'ActionScreenshotNode'

export const ActionTapNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { x?: number; y?: number }
  return (
    <BaseNode id={id} data={d}>
      <div className="flex gap-2">
        <NodeInput id={id} type="number" paramKey="x" label="X 坐标" value={p.x} />
        <NodeInput id={id} type="number" paramKey="y" label="Y 坐标" value={p.y} />
      </div>
    </BaseNode>
  )
})
ActionTapNode.displayName = 'ActionTapNode'

export const ActionSwipeNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { x1?: number; y1?: number; x2?: number; y2?: number; duration?: number }
  return (
    <BaseNode id={id} data={d}>
      <div className="flex gap-2">
        <NodeInput id={id} type="number" paramKey="x1" label="起点 X" value={p.x1} />
        <NodeInput id={id} type="number" paramKey="y1" label="起点 Y" value={p.y1} />
      </div>
      <div className="flex gap-2">
        <NodeInput id={id} type="number" paramKey="x2" label="终点 X" value={p.x2} />
        <NodeInput id={id} type="number" paramKey="y2" label="终点 Y" value={p.y2} />
      </div>
      <NodeInput id={id} type="number" paramKey="duration" label="时长 (ms)" value={p.duration} />
    </BaseNode>
  )
})
ActionSwipeNode.displayName = 'ActionSwipeNode'

export const ActionInputTextNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { text?: string }
  return (
    <BaseNode id={id} data={d}>
      <NodeInput id={id} paramKey="text" label="输入文字" value={p.text} placeholder="支持 {{var}} 模板" />
    </BaseNode>
  )
})
ActionInputTextNode.displayName = 'ActionInputTextNode'

export const ActionInstallAppNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { packagePath?: string }
  return (
    <BaseNode id={id} data={d}>
      <NodeInput id={id} paramKey="packagePath" label="安装包路径" value={p.packagePath} />
    </BaseNode>
  )
})
ActionInstallAppNode.displayName = 'ActionInstallAppNode'

export const ActionUninstallAppNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { packageName?: string }
  return (
    <BaseNode id={id} data={d}>
      <NodeInput id={id} paramKey="packageName" label="包名" value={p.packageName} />
    </BaseNode>
  )
})
ActionUninstallAppNode.displayName = 'ActionUninstallAppNode'

export const ActionLaunchAppNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { packageName?: string; activity?: string; cold?: boolean }
  const { updateNodeParams } = useWorkflowStore()
  return (
    <BaseNode id={id} data={d}>
      <NodeInput id={id} paramKey="packageName" label="包名" value={p.packageName} placeholder="com.example.app" />
      <NodeInput id={id} paramKey="activity" label="Ability（鸿蒙可选）" value={p.activity} placeholder="自动探测" />
      <div className="flex items-center gap-2 pt-0.5 nodrag">
        <button
          type="button"
          onClick={() => updateNodeParams(id, { cold: !p.cold })}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border',
            p.cold
              ? 'bg-amber-500/10 text-amber-600 border-amber-400/40'
              : 'bg-emerald-500/10 text-emerald-600 border-emerald-400/40'
          )}
        >
          {p.cold ? '冷启动' : '热启动'}
        </button>
        <span className="text-[10px] text-muted-foreground">{p.cold ? '先 force-stop 再启动' : '直接拉起前台'}</span>
      </div>
    </BaseNode>
  )
})
ActionLaunchAppNode.displayName = 'ActionLaunchAppNode'

export const ActionCloseAppNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { packageName?: string }
  return (
    <BaseNode id={id} data={d}>
      <NodeInput id={id} paramKey="packageName" label="包名" value={p.packageName} placeholder="com.example.app" />
    </BaseNode>
  )
})
ActionCloseAppNode.displayName = 'ActionCloseAppNode'

export const ActionShellNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { command?: string; saveToVar?: string }
  return (
    <BaseNode id={id} data={d}>
      <NodeInput id={id} paramKey="command" label="Shell 命令" multiline value={p.command} />
      <NodeInput id={id} paramKey="saveToVar" label="存入变量" value={p.saveToVar} placeholder="可选" />
    </BaseNode>
  )
})
ActionShellNode.displayName = 'ActionShellNode'

export const ActionGetVarNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { key?: string; saveToVar?: string }
  return (
    <BaseNode id={id} data={d}>
      <NodeInput id={id} paramKey="key" label="读取变量键名" value={p.key} />
      <NodeInput id={id} paramKey="saveToVar" label="存入上下文变量名" value={p.saveToVar} />
    </BaseNode>
  )
})
ActionGetVarNode.displayName = 'ActionGetVarNode'

export const ActionSetVarNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { key?: string; value?: string }
  return (
    <BaseNode id={id} data={d}>
      <NodeInput id={id} paramKey="key" label="全局变量键名" value={p.key} />
      <NodeInput id={id} paramKey="value" label="值" value={p.value} placeholder="支持 {{var}} 模板" />
    </BaseNode>
  )
})
ActionSetVarNode.displayName = 'ActionSetVarNode'

export const ControlIfNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { condition?: string }
  return (
    <BaseNode
      id={id}
      data={d}
      outputHandles={[
        { id: 'yes', label: '是', style: { left: '30%' } },
        { id: 'no',  label: '否', style: { left: '70%' } },
      ]}
    >
      <NodeInput id={id} paramKey="condition" label="JS 条件表达式" multiline value={p.condition} placeholder="ctx.result === 'ok'" />
      <div className="flex justify-between text-[10px] font-medium px-0.5">
        <span className="text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
          是分支
        </span>
        <span className="text-red-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
          否分支
        </span>
      </div>
    </BaseNode>
  )
})
ControlIfNode.displayName = 'ControlIfNode'

export const ControlLoopNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { count?: number }
  return (
    <BaseNode
      id={id}
      data={d}
      outputHandles={[
        { id: 'loop-body', label: '循环体', style: { left: '30%' } },
        { id: 'loop-done', label: '完成',   style: { left: '70%' } },
      ]}
    >
      <NodeInput id={id} type="number" paramKey="count" label="循环次数" value={p.count} />
      <div className="flex justify-between text-[10px] font-medium px-0.5">
        <span className="text-indigo-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
          循环体
        </span>
        <span className="text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
          完成后
        </span>
      </div>
    </BaseNode>
  )
})
ControlLoopNode.displayName = 'ControlLoopNode'

export const ControlDelayNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { ms?: number }
  return (
    <BaseNode id={id} data={d}>
      <NodeInput id={id} type="number" paramKey="ms" label="延迟等待 (ms)" value={p.ms} />
    </BaseNode>
  )
})
ControlDelayNode.displayName = 'ControlDelayNode'

// ── New Action Nodes ──────────────────────────────────────────────────────

export const ActionDoubleTapNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { x?: number; y?: number }
  return (
    <BaseNode id={id} data={d}>
      <div className="flex gap-2">
        <NodeInput id={id} type="number" paramKey="x" label="X 坐标" value={p.x} />
        <NodeInput id={id} type="number" paramKey="y" label="Y 坐标" value={p.y} />
      </div>
    </BaseNode>
  )
})
ActionDoubleTapNode.displayName = 'ActionDoubleTapNode'

export const ActionLongClickNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { x?: number; y?: number; duration?: number }
  return (
    <BaseNode id={id} data={d}>
      <div className="flex gap-2">
        <NodeInput id={id} type="number" paramKey="x" label="X 坐标" value={p.x} />
        <NodeInput id={id} type="number" paramKey="y" label="Y 坐标" value={p.y} />
      </div>
      <NodeInput id={id} type="number" paramKey="duration" label="时长 (ms)" value={p.duration} placeholder="2000" />
    </BaseNode>
  )
})
ActionLongClickNode.displayName = 'ActionLongClickNode'

export const ActionDragNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { x1?: number; y1?: number; x2?: number; y2?: number; duration?: number }
  return (
    <BaseNode id={id} data={d}>
      <div className="flex gap-2">
        <NodeInput id={id} type="number" paramKey="x1" label="起点 X" value={p.x1} />
        <NodeInput id={id} type="number" paramKey="y1" label="起点 Y" value={p.y1} />
      </div>
      <div className="flex gap-2">
        <NodeInput id={id} type="number" paramKey="x2" label="终点 X" value={p.x2} />
        <NodeInput id={id} type="number" paramKey="y2" label="终点 Y" value={p.y2} />
      </div>
      <NodeInput id={id} type="number" paramKey="duration" label="时长 (ms)" value={p.duration} />
    </BaseNode>
  )
})
ActionDragNode.displayName = 'ActionDragNode'

export const ActionClearTextNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { length?: number }
  return (
    <BaseNode id={id} data={d}>
      <NodeInput id={id} type="number" paramKey="length" label="最大删除字符数" value={p.length} placeholder="100" />
    </BaseNode>
  )
})
ActionClearTextNode.displayName = 'ActionClearTextNode'

const KEY_PRESETS = [
  { label: '返回 (Back)',    android: 4,   harmony: 2 },
  { label: '主屏幕 (Home)', android: 3,   harmony: 1 },
  { label: '最近任务',       android: 187, harmony: 3 },
  { label: '回车 (Enter)',   android: 66,  harmony: 2054 },
  { label: '删除 (Del)',     android: 67,  harmony: 2055 },
]

export const ActionKeyEventNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { keyCode?: number }
  const updateNodeParams = useWorkflowStore((s) => s.updateNodeParams)
  const disabled = useWorkflowStore((s) => s.runStatus === 'running')

  return (
    <BaseNode id={id} data={d}>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          快捷预设
        </Label>
        <div className="flex flex-wrap gap-1">
          {KEY_PRESETS.map((preset) => (
            <button
              key={preset.android}
              type="button"
              disabled={disabled}
              className="px-1.5 py-0.5 text-[10px] rounded border border-border hover:bg-accent transition-colors disabled:opacity-40"
              onClick={() => updateNodeParams(id, { keyCode: preset.android })}
            >
              {preset.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
      <NodeInput id={id} type="number" paramKey="keyCode" label="KeyCode" value={p.keyCode} placeholder="Android:4 / Harmony:2" />
    </BaseNode>
  )
})
ActionKeyEventNode.displayName = 'ActionKeyEventNode'

// ── nodeTypes map (pass to ReactFlow) ────────────────────────────────────

export const nodeTypes = {
  'trigger-manual':       TriggerManualNode,
  'action-screenshot':    ActionScreenshotNode,
  'action-tap':           ActionTapNode,
  'action-double-tap':    ActionDoubleTapNode,
  'action-long-click':    ActionLongClickNode,
  'action-swipe':         ActionSwipeNode,
  'action-drag':          ActionDragNode,
  'action-input-text':    ActionInputTextNode,
  'action-clear-text':    ActionClearTextNode,
  'action-key-event':     ActionKeyEventNode,
  'action-install-app':   ActionInstallAppNode,
  'action-uninstall-app': ActionUninstallAppNode,
  'action-launch-app':    ActionLaunchAppNode,
  'action-close-app':     ActionCloseAppNode,
  'action-shell':         ActionShellNode,
  'action-get-var':       ActionGetVarNode,
  'action-set-var':       ActionSetVarNode,
  'control-if':           ControlIfNode,
  'control-loop':         ControlLoopNode,
  'control-delay':        ControlDelayNode,
}
