import type { WorkflowNodeType } from './workflow'

export const DEFAULT_NODE_PARAMS: Partial<Record<WorkflowNodeType, Record<string, unknown>>> = {
  'action-tap': { x: 0, y: 0 },
  'action-double-tap': { x: 0, y: 0 },
  'action-long-click': { x: 0, y: 0, duration: 2000 },
  'action-swipe': { x1: 0, y1: 0, x2: 0, y2: 500, duration: 300 },
  'action-drag': { x1: 0, y1: 0, x2: 0, y2: 300, duration: 500 },
  'action-input-text': { text: '' },
  'action-clear-text': { length: 100 },
  'action-key-event': { keyCode: 4 },
  'action-screenshot': { saveToVar: '' },
  'action-install-app': { packagePath: '' },
  'action-uninstall-app': { packageName: '' },
  'action-launch-app': { packageName: '', activity: '', cold: false },
  'action-close-app': { packageName: '' },
  'action-find-and-tap': { targetText: '', matchType: 'contains', action: 'tap' },
  'action-shell': { command: '', saveToVar: '' },
  'action-get-var': { key: '', saveToVar: '' },
  'action-set-var': { key: '', value: '' },
  'control-if': { condition: 'ctx.result === "ok"' },
  'control-loop': { count: 3 },
  'control-delay': { ms: 3000 },
}
