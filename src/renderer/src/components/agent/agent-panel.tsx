import { useEffect, useCallback } from 'react'
import { useAgentStore } from '@/stores/agent'
import { useWorkflowStore } from '@/stores/workflow'
import { useDevicesStore } from '@/stores/devices'
import { getBaseUrl } from '@/lib/settings'
import { Button } from '@/components/ui/button'
import { ExecutionTrace } from './execution-trace'
import { PlanPanel } from './plan-panel'
import { RepairCard, RepairFailedBanner } from './repair-card'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Bot, Play, Pause, StepForward, Square, RotateCcw,
  Zap, Bug, CircleDot, Sparkles, Footprints,
} from 'lucide-react'
import type { Workflow } from '../../../../shared/workflow'

function buildRunWorkflow(
  workflow: Workflow,
  rfNodes: ReturnType<typeof useWorkflowStore.getState>['rfNodes'],
  rfEdges: ReturnType<typeof useWorkflowStore.getState>['rfEdges']
): Workflow {
  return {
    ...workflow,
    nodes: rfNodes.map((n) => ({
      id: n.id,
      type: n.type as Workflow['nodes'][0]['type'],
      label: (n.data.label as string) ?? n.type ?? '',
      params: (n.data.params ?? {}) as Workflow['nodes'][0]['params'],
      position: n.position,
      postDelayMs: (n.data.postDelayMs as number | undefined) || undefined,
    })),
    edges: rfEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
    })),
  }
}

export function AgentPanel() {
  const {
    status, mode, breakpoints, pausedReason, summary,
    activeTab, stepAssertions, acceptanceCriteria, autoRepair,
    setMode, setActiveTab, setAutoRepair, toggleBreakpoint, reset, handleEvent,
  } = useAgentStore()

  const {
    workflows, activeWorkflowId, rfNodes, rfEdges,
    saveActiveWorkflow, updateNodeStepStatus, clearNodeStepStatuses,
    selectedNodeId, runStatus, applyWorkflowPatches,
    beginPlanStream, appendPlanStep, finalizePlanStream,
  } = useWorkflowStore()

  const selectedDeviceId = useDevicesStore((s) => s.selectedId)
  const workflow = workflows.find((w) => w.id === activeWorkflowId)

  const isAgentActive = status === 'running' || status === 'paused'
  const isBusy = isAgentActive || runStatus === 'running'

  useEffect(() => {
    const unsub = window.api?.agent?.onEvent((event) => {
      handleEvent(event)

      if (event.type === 'plan_stream_init') {
        beginPlanStream({
          workflowId: event.workflowId,
          name: event.name,
          description: event.description,
          triggerNode: event.triggerNode,
        })
      } else if (event.type === 'plan_step_applied') {
        appendPlanStep({ node: event.node, edge: event.edge })
      } else if (event.type === 'plan_done') {
        finalizePlanStream(event.draft.workflow)
        toast.success(`已流式生成 ${event.draft.steps.length} 步工作流`)
      } else if (event.type === 'step_start') {
        updateNodeStepStatus(event.nodeId, 'running')
      } else if (event.type === 'step_end') {
        updateNodeStepStatus(event.checkpoint.nodeId, event.checkpoint.ok ? 'success' : 'error')
      } else if (event.type === 'workflow_patched') {
        applyWorkflowPatches(event.patches)
      } else if (event.type === 'done') {
        setTimeout(() => clearNodeStepStatuses(), 3000)
      }
    })
    return () => unsub?.()
  }, [
    handleEvent, updateNodeStepStatus, clearNodeStepStatuses, applyWorkflowPatches,
    beginPlanStream, appendPlanStep, finalizePlanStream,
  ])

  const startAgent = useCallback(async (fromNodeId?: string) => {
    if (!workflow) {
      toast.error('请先打开一个工作流')
      return
    }
    if (!selectedDeviceId) {
      toast.error('请先选择设备')
      return
    }

    saveActiveWorkflow()
    reset()
    clearNodeStepStatuses()
    setActiveTab('run')

    const runWorkflow = buildRunWorkflow(workflow, rfNodes, rfEdges)
    const res = await window.api?.agent?.start({
      workflow: runWorkflow,
      deviceId: selectedDeviceId,
      baseUrl: getBaseUrl(),
      mode,
      breakpoints: Array.from(breakpoints),
      fromNodeId,
      stepAssertions,
      acceptanceCriteria,
      autoRepair,
      maxRepairAttempts: 3,
    })

    if (!res?.ok) {
      toast.error(res?.error ?? '启动失败')
    }
  }, [
    workflow, selectedDeviceId, saveActiveWorkflow, reset, clearNodeStepStatuses,
    rfNodes, rfEdges, mode, breakpoints, stepAssertions, acceptanceCriteria, autoRepair, setActiveTab,
  ])

  async function handlePause() {
    const res = await window.api?.agent?.pause()
    if (!res?.ok) toast.error(res?.error ?? '暂停失败')
  }

  async function handleResume() {
    const res = await window.api?.agent?.resume()
    if (!res?.ok) toast.error(res?.error ?? '恢复失败')
  }

  async function handleStep() {
    const res = await window.api?.agent?.step()
    if (!res?.ok) toast.error(res?.error ?? '单步失败')
  }

  function handleStop() {
    window.api?.agent?.stop()
  }

  function handleRetry() {
    const failedId = summary?.failedNodeId
    if (!failedId) {
      toast.error('没有可重试的失败节点')
      return
    }
    void startAgent(failedId)
  }

  const PAUSE_REASON: Record<string, string> = {
    debug: '调试模式：等待单步',
    breakpoint: '命中断点',
    failure: '步骤执行失败',
    assertion: '断言未通过',
    user: '用户暂停',
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l bg-card">
      {/* Header + Tabs */}
      <div className="px-3 py-2.5 border-b shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Agent</span>
        </div>

        <div className="flex gap-1 p-0.5 rounded-lg bg-muted/50 border border-border/50">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-medium transition-colors',
              activeTab === 'plan' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            )}
          >
            <Sparkles className="w-3 h-3" />
            编排
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('run')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-medium transition-colors',
              activeTab === 'run' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            )}
          >
            <Footprints className="w-3 h-3" />
            执行
          </button>
        </div>
      </div>

      {activeTab === 'plan' ? (
        <PlanPanel />
      ) : (
        <>
          <div className="px-3 py-2 border-b space-y-2 shrink-0">
            <div className="flex gap-1 p-0.5 rounded-lg bg-muted/50 border border-border/50">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setMode('auto')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-medium transition-colors',
                  mode === 'auto' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                )}
              >
                <Zap className="w-3 h-3" />
                自动
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setMode('debug')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-medium transition-colors',
                  mode === 'debug' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                )}
              >
                <Bug className="w-3 h-3" />
                调试
              </button>
            </div>

            <label className="flex items-center gap-2 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={autoRepair}
                disabled={isBusy}
                onChange={(e) => setAutoRepair(e.target.checked)}
                className="rounded"
              />
              失败时自动修复并重试
            </label>

            {!isAgentActive ? (
              <Button
                size="sm"
                className="w-full h-8 text-xs gap-1.5"
                disabled={!activeWorkflowId || isBusy}
                onClick={() => void startAgent()}
              >
                <Play className="w-3.5 h-3.5" />
                启动 Agent 执行
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {status === 'paused' ? (
                  <>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => void handleStep()}>
                      <StepForward className="w-3.5 h-3.5" />
                      单步
                    </Button>
                    <Button size="sm" className="h-8 text-xs gap-1" onClick={() => void handleResume()}>
                      <Play className="w-3.5 h-3.5" />
                      继续
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1 col-span-2" onClick={() => void handlePause()}>
                    <Pause className="w-3.5 h-3.5" />
                    暂停
                  </Button>
                )}
                <Button size="sm" variant="destructive" className="h-8 text-xs gap-1 col-span-2" onClick={handleStop}>
                  <Square className="w-3.5 h-3.5" />
                  停止
                </Button>
              </div>
            )}

            {summary?.failedNodeId && !isAgentActive && (
              <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5" onClick={handleRetry}>
                <RotateCcw className="w-3.5 h-3.5" />
                从失败节点重试
              </Button>
            )}

            {selectedNodeId && !isBusy && (
              <Button
                size="sm"
                variant="ghost"
                className={cn('w-full h-7 text-xs gap-1.5', breakpoints.has(selectedNodeId) && 'text-amber-600')}
                onClick={() => toggleBreakpoint(selectedNodeId)}
              >
                <CircleDot className="w-3.5 h-3.5" />
                {breakpoints.has(selectedNodeId) ? '移除断点' : '在此设断点'}
              </Button>
            )}

            {pausedReason && status === 'paused' && (
              <p className="text-[10px] text-amber-600 bg-amber-500/10 rounded px-2 py-1">
                {PAUSE_REASON[pausedReason] ?? pausedReason}
              </p>
            )}

            {summary && !isAgentActive && (
              <p className={cn(
                'text-[10px] rounded px-2 py-1',
                summary.status === 'done' ? 'text-emerald-600 bg-emerald-500/10' : 'text-red-600 bg-red-500/10'
              )}>
                {summary.status === 'done'
                  ? `完成 ${summary.successSteps}/${summary.totalSteps} 步 · ${summary.duration}ms${summary.repairAttempts ? ` · 修复 ${summary.repairAttempts} 次` : ''}`
                  : `失败 ${summary.failedSteps} 步 · ${summary.duration}ms${summary.repairAttempts ? ` · 已尝试修复 ${summary.repairAttempts} 次` : ''}`}
              </p>
            )}

            <RepairCard />
            <RepairFailedBanner />
          </div>

          <ExecutionTrace />
        </>
      )}
    </div>
  )
}
