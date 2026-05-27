import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { useWorkflowStore } from '@/stores/workflow'
import {
  Play, Camera, MousePointerClick, MoveVertical, Keyboard,
  Package, Trash2, Terminal, BookOpen, Pencil,
  GitBranch, Repeat, Timer,
  CheckCircle2, AlertCircle, Loader2
} from 'lucide-react'

// ── 节点类别颜色配置 ───────────────────────────────────────────────────

const NODE_META: Record<
  string,
  { label: string; icon: React.ReactNode; handleColor: string }
> = {
  'trigger-manual':      { label: '手动触发',   icon: <Play className="w-[18px] h-[18px]" />,          handleColor: '#10b981' },
  'action-screenshot':   { label: '截图',        icon: <Camera className="w-[18px] h-[18px]" />,        handleColor: '#3b82f6' },
  'action-tap':          { label: '点击',        icon: <MousePointerClick className="w-[18px] h-[18px]" />, handleColor: '#3b82f6' },
  'action-swipe':        { label: '滑动',        icon: <MoveVertical className="w-[18px] h-[18px]" />,  handleColor: '#3b82f6' },
  'action-input-text':   { label: '输入文字',    icon: <Keyboard className="w-[18px] h-[18px]" />,      handleColor: '#3b82f6' },
  'action-install-app':  { label: '安装应用',    icon: <Package className="w-[18px] h-[18px]" />,       handleColor: '#8b5cf6' },
  'action-uninstall-app':{ label: '卸载应用',    icon: <Trash2 className="w-[18px] h-[18px]" />,        handleColor: '#8b5cf6' },
  'action-shell':        { label: 'Shell 命令',  icon: <Terminal className="w-[18px] h-[18px]" />,      handleColor: '#f97316' },
  'action-get-var':      { label: '读取变量',    icon: <BookOpen className="w-[18px] h-[18px]" />,      handleColor: '#eab308' },
  'action-set-var':      { label: '写入变量',    icon: <Pencil className="w-[18px] h-[18px]" />,        handleColor: '#eab308' },
  'control-if':          { label: '条件判断',    icon: <GitBranch className="w-[18px] h-[18px]" />,     handleColor: '#ec4899' },
  'control-loop':        { label: '循环',        icon: <Repeat className="w-[18px] h-[18px]" />,        handleColor: '#ec4899' },
  'control-delay':       { label: '延迟等待',    icon: <Timer className="w-[18px] h-[18px]" />,         handleColor: '#ec4899' },
}

// ── 运行状态样式 ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  running: 'ring-2 ring-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-500/50',
  success: 'ring-1 ring-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)] border-emerald-500',
  error:   'ring-1 ring-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.2)] border-red-500',
}

// ── Base Node Component ───────────────────────────────────────────────────

interface WorkflowNodeData {
  label: string
  nodeType: string
  params: Record<string, unknown>
  stepStatus?: 'running' | 'success' | 'error'
  selected?: boolean
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
  const meta = NODE_META[data.nodeType] ?? { label: data.nodeType, icon: <div/>, handleColor: '#888' }
  const statusStyle = data.stepStatus ? STATUS_STYLES[data.stepStatus] : ''
  const { updateNodeLabel, runStatus, selectedNodeId } = useWorkflowStore()
  const disabled = runStatus === 'running'
  const isSelected = selectedNodeId === id

  return (
    <div
      className={cn(
        'relative w-[280px] rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-xl transition-all duration-200 group flex flex-col',
        isSelected && 'ring-1 ring-primary border-primary shadow-primary/10',
        statusStyle
      )}
    >
      {/* Input handle */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-4 !h-4 !rounded-full !border-[3px] !border-background transition-transform hover:!scale-125 !-mt-[2px] shadow-sm z-10"
          style={{ backgroundColor: meta.handleColor }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div 
            className="flex items-center justify-center w-9 h-9 rounded-[10px] shadow-sm border border-border/50 bg-background/50 flex-shrink-0"
            style={{ color: meta.handleColor }}
          >
            {meta.icon}
          </div>
          <div className="flex flex-col flex-1 min-w-0 pt-0.5">
            <input
              className="nodrag bg-transparent border-none p-0 text-sm font-semibold text-foreground focus:ring-0 placeholder-muted-foreground truncate w-full outline-none"
              value={data.label}
              disabled={disabled}
              onChange={(e) => updateNodeLabel(id, e.target.value)}
              placeholder="节点名称"
            />
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5 opacity-80 uppercase tracking-wider">
              {meta.label}
            </span>
          </div>
        </div>
        
        {/* Status Indicators */}
        <div className="flex-shrink-0 pl-2">
          {data.stepStatus === 'running' && (
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          )}
          {data.stepStatus === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          )}
          {data.stepStatus === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
        </div>
      </div>

      {/* Custom content (Form inputs) */}
      {children && (
        <div className="px-4 py-3 bg-muted/30 border-t border-border/50 flex flex-col gap-3">
          {children}
        </div>
      )}

      {/* Output handle(s) */}
      {hasOutput && !outputHandles && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-4 !h-4 !rounded-full !border-[3px] !border-background transition-transform hover:!scale-125 !-mb-[2px] shadow-sm z-10"
          style={{ backgroundColor: meta.handleColor }}
        />
      )}
      {outputHandles?.map((h) => (
        <div key={h.id} className="relative z-10">
          <Handle
            id={h.id}
            type="source"
            position={Position.Bottom}
            className="!w-4 !h-4 !rounded-full !border-[3px] !border-background transition-transform hover:!scale-125 !-mb-[2px] shadow-sm"
            style={{ backgroundColor: meta.handleColor, ...h.style }}
          />
        </div>
      ))}
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
      <label className="text-[11px] font-medium text-foreground/80 flex items-center justify-between">
        {label}
      </label>
      {multiline ? (
        <textarea
          className="nodrag nowheel block w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y font-mono transition-all shadow-sm"
          value={String(value ?? '')}
          disabled={disabled}
          rows={2}
          placeholder={placeholder}
          onChange={(e) => updateNodeParams(id, { [paramKey]: e.target.value })}
        />
      ) : (
        <input
          type={type}
          className="nodrag block w-full rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition-all shadow-sm"
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
  return (
    <BaseNode id={id} data={d}>
      <NodeInput id={id} paramKey="saveToVar" label="存入变量" value={p.saveToVar} placeholder="可选" />
    </BaseNode>
  )
})
ActionScreenshotNode.displayName = 'ActionScreenshotNode'

export const ActionTapNode = memo(({ id, data }: NodeProps) => {
  const d = data as unknown as WorkflowNodeData
  const p = d.params as { x?: number; y?: number }
  return (
    <BaseNode id={id} data={d}>
      <div className="flex gap-3">
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
      <div className="flex gap-3">
        <NodeInput id={id} type="number" paramKey="x1" label="起点 X" value={p.x1} />
        <NodeInput id={id} type="number" paramKey="y1" label="起点 Y" value={p.y1} />
      </div>
      <div className="flex gap-3">
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
      <div className="flex justify-between text-[11px] font-medium text-emerald-600 dark:text-emerald-500 mt-2 px-2">
        <span>✓ 是分支</span>
        <span className="text-red-600 dark:text-red-500">✗ 否分支</span>
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
      <div className="flex justify-between text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-2 px-2">
        <span>↩ 循环体</span>
        <span className="text-muted-foreground">→ 完成后</span>
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

// ── nodeTypes map (pass to ReactFlow) ────────────────────────────────────

export const nodeTypes = {
  'trigger-manual':      TriggerManualNode,
  'action-screenshot':   ActionScreenshotNode,
  'action-tap':          ActionTapNode,
  'action-swipe':        ActionSwipeNode,
  'action-input-text':   ActionInputTextNode,
  'action-install-app':  ActionInstallAppNode,
  'action-uninstall-app':ActionUninstallAppNode,
  'action-shell':        ActionShellNode,
  'action-get-var':      ActionGetVarNode,
  'action-set-var':      ActionSetVarNode,
  'control-if':          ControlIfNode,
  'control-loop':        ControlLoopNode,
  'control-delay':       ControlDelayNode,
}
