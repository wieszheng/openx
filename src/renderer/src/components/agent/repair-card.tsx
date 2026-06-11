import { useAgentStore } from '@/stores/agent'
import { useWorkflowStore } from '@/stores/workflow'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Wrench, CheckCircle2, XCircle } from 'lucide-react'
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

export function RepairCard() {
  const { lastRepairProposal, repairHistory } = useAgentStore()
  const { workflows, activeWorkflowId, rfNodes, rfEdges, applyWorkflowPatches, importAgentDraft } = useWorkflowStore()
  const workflow = workflows.find((w) => w.id === activeWorkflowId)

  const proposal = lastRepairProposal

  if (!proposal) return null

  async function handleApply() {
    if (!workflow || !proposal) return

    const runWorkflow = buildRunWorkflow(workflow, rfNodes, rfEdges)
    const res = await window.api?.agent?.applyRepair({ workflow: runWorkflow, proposal })

    if (!res?.ok || !res.workflow) {
      toast.error(res?.error ?? '应用修复失败')
      return
    }

    importAgentDraft(res.workflow)
    toast.success('修复已应用到画布')
  }

  function handleApplyPatchesOnly() {
    if (!proposal) return
    applyWorkflowPatches(proposal.patches)
    toast.success('已更新节点参数')
  }

  const CONFIDENCE: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  }

  return (
    <div className="rounded-lg border border-amber-400/40 bg-amber-500/5 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <Wrench className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">修复建议</span>
        <span className={cn(
          'ml-auto text-[10px] px-1.5 py-0.5 rounded',
          proposal.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
        )}>
          置信度 {CONFIDENCE[proposal.confidence]}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">{proposal.summary}</p>

      <div className="space-y-1">
        {proposal.patches.map((p, i) => (
          <div key={i} className="flex items-start gap-1 text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
            <span className="text-foreground/80">{p.description}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={handleApplyPatchesOnly}>
          更新画布
        </Button>
        <Button size="sm" className="h-7 text-[10px] flex-1" onClick={() => void handleApply()}>
          应用并保存
        </Button>
      </div>

      {repairHistory.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          本次已自动修复 {repairHistory.length} 次
        </p>
      )}
    </div>
  )
}

export function RepairFailedBanner() {
  const { lastRepairFailed } = useAgentStore()
  if (!lastRepairFailed) return null

  return (
    <div className="rounded-lg border border-red-400/30 bg-red-500/5 p-2 flex items-start gap-1.5">
      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-red-600">无法自动修复</p>
        <p className="text-[10px] text-muted-foreground">{lastRepairFailed}</p>
      </div>
    </div>
  )
}
