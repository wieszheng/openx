import type { Checkpoint, FailureReport, FailureType } from '../../../shared/agent'
import type { WorkflowNode } from '../../../shared/workflow'

export function classifyFailure(
  node: WorkflowNode,
  checkpoint: Checkpoint,
  isAssertion = false
): FailureReport {
  const output = checkpoint.output ?? ''
  let failureType: FailureType = 'UNKNOWN'
  let message = output || '步骤执行失败'

  if (isAssertion) {
    failureType = 'ASSERTION_FAIL'
    message = output || '断言未通过'
  } else if (/OCR 未找到|未找到文字/.test(output)) {
    failureType = 'OCR_NOT_FOUND'
  } else if (/超时|timeout/i.test(output)) {
    failureType = 'TIMEOUT'
  } else if (/device|adb|hdc|连接|unauthorized|offline/i.test(output)) {
    failureType = 'DEVICE_ERROR'
  } else if (!checkpoint.ok) {
    failureType = 'EXECUTION_ERROR'
  }

  return {
    nodeId: node.id,
    nodeLabel: node.label,
    nodeType: node.type,
    failureType,
    message,
    checkpoint,
  }
}
