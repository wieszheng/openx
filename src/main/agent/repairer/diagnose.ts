import type { Checkpoint, FailureReport, RepairProposal, WorkflowPatch } from '../../../shared/agent'
import type { Workflow, WorkflowNode } from '../../../shared/workflow'

function findBestOcrMatch(target: string, checkpoint?: Checkpoint): string | null {
  const items = checkpoint?.ocrItems ?? []
  if (!target || items.length === 0) return null

  const normalized = target.replace(/\s/g, '')
  let best: { text: string; score: number } | null = null

  for (const item of items) {
    const text = item.text.trim()
    if (!text) continue
    const t = text.replace(/\s/g, '')

    let score = 0
    if (t === normalized) score = 100
    else if (t.includes(normalized) || normalized.includes(t)) score = 80
    else {
      const common = [...normalized].filter((c) => t.includes(c)).length
      score = (common / Math.max(normalized.length, 1)) * 60
    }

    if (!best || score > best.score) best = { text, score }
  }

  return best && best.score >= 40 ? best.text : null
}

function findPreviousNodeId(workflow: Workflow, nodeId: string): string | null {
  const edge = workflow.edges.find((e) => e.target === nodeId)
  return edge?.source ?? null
}

function diagnoseOcrNotFound(
  failure: FailureReport,
  node: WorkflowNode,
  workflow: Workflow
): RepairProposal | null {
  const params = node.params as Record<string, unknown>
  const targetText = String(params.targetText ?? '')
  const candidate = findBestOcrMatch(targetText, failure.checkpoint)
  const patches: WorkflowPatch[] = []

  if (candidate && candidate !== targetText) {
    patches.push({
      op: 'update_params',
      nodeId: node.id,
      params: { targetText: candidate, matchType: 'contains' },
      description: `OCR 目标文字「${targetText}」→「${candidate}」`,
    })
  } else if (targetText) {
    patches.push({
      op: 'update_params',
      nodeId: node.id,
      params: { matchType: 'contains' },
      description: `放宽匹配方式为「包含」`,
    })
  }

  const prevId = findPreviousNodeId(workflow, node.id)
  if (prevId) {
    const prev = workflow.nodes.find((n) => n.id === prevId)
    const currentDelay = prev?.postDelayMs ?? 2000
    patches.push({
      op: 'update_post_delay',
      nodeId: prevId,
      postDelayMs: currentDelay + 2000,
      description: `上一步等待 ${currentDelay}ms → ${currentDelay + 2000}ms`,
    })
  }

  if (patches.length === 0) return null

  return {
    failure,
    patches,
    confidence: candidate ? 'high' : 'medium',
    autoApplicable: true,
    summary: candidate
      ? `在屏幕 OCR 中找到相似文字「${candidate}」，将自动替换目标`
      : '将延长上一步等待时间并放宽匹配方式',
  }
}

function diagnoseAssertionFail(
  failure: FailureReport,
  node: WorkflowNode
): RepairProposal | null {
  const params = node.params as Record<string, unknown>
  if (node.type === 'action-find-and-tap' && params.action === 'assert') {
    const targetText = String(params.targetText ?? '')
    const candidate = findBestOcrMatch(targetText, failure.checkpoint)
    if (candidate && candidate !== targetText) {
      return {
        failure,
        patches: [{
          op: 'update_params',
          nodeId: node.id,
          params: { targetText: candidate, matchType: 'contains' },
          description: `断言文字「${targetText}」→「${candidate}」`,
        }],
        confidence: 'high',
        autoApplicable: true,
        summary: `屏幕实际文字更接近「${candidate}」`,
      }
    }
  }
  return null
}

function diagnoseTimeout(
  failure: FailureReport,
  node: WorkflowNode,
  workflow: Workflow
): RepairProposal | null {
  const prevId = findPreviousNodeId(workflow, node.id)
  if (!prevId) return null
  const prev = workflow.nodes.find((n) => n.id === prevId)
  const currentDelay = prev?.postDelayMs ?? 2000
  return {
    failure,
    patches: [{
      op: 'update_post_delay',
      nodeId: prevId,
      postDelayMs: currentDelay + 3000,
      description: `延长等待 ${currentDelay}ms → ${currentDelay + 3000}ms`,
    }],
    confidence: 'medium',
    autoApplicable: true,
    summary: '页面可能加载较慢，将延长上一步等待时间',
  }
}

export function diagnoseFailure(
  failure: FailureReport,
  node: WorkflowNode,
  workflow: Workflow,
  isAssertion = false
): RepairProposal | null {
  if (failure.failureType === 'DEVICE_ERROR') return null

  if (isAssertion || failure.failureType === 'ASSERTION_FAIL') {
    return diagnoseAssertionFail(failure, node) ?? diagnoseOcrNotFound(failure, node, workflow)
  }

  switch (failure.failureType) {
    case 'OCR_NOT_FOUND':
      return diagnoseOcrNotFound(failure, node, workflow)
    case 'TIMEOUT':
      return diagnoseTimeout(failure, node, workflow)
    case 'EXECUTION_ERROR':
      if (/OCR|未找到|文字/.test(failure.message)) {
        return diagnoseOcrNotFound(failure, node, workflow)
      }
      return null
    default:
      return diagnoseOcrNotFound(failure, node, workflow)
  }
}
