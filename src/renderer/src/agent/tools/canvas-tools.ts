/**
 * 画布操作工具
 *
 * 操作 React Flow 工作流画布的工具：
 * - add_workflow_nodes：批量添加工作流节点
 * - clear_workflow_canvas：清空画布
 */

import { defineTool } from './define-tool'
import type { ToolContext } from './tool-types'
import type { ToolResult } from '../core/types'

/** 批量添加工作流节点到画布 */
export const addWorkflowNodesTool = defineTool({
  name: 'add_workflow_nodes',
  description:
    '往用户的 React Flow 图形化工作流编辑画布上，批量添加测试编排节点步骤。通常在完成探索或明确流程时调用。',
  paramSchema: {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        description: '步骤节点数组',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: '步骤节点类型，如 action-tap, action-launch-app, control-delay 等',
            },
            label: {
              type: 'string',
              description: '显示在画布节点上的友好中文简短名称',
            },
            params: {
              type: 'object',
              description: '节点所需参数配置',
            },
          },
          required: ['type', 'label', 'params'],
        },
      },
    },
    required: ['steps'],
  },
  requiresDevice: false,
  execute: async (args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
    const { steps } = args as { steps?: unknown[] }

    if (!steps || !Array.isArray(steps)) {
      return { success: false, error: '参数 steps 缺失或不是有效的步骤数组' }
    }

    for (const step of steps) {
      const s = step as Record<string, unknown>
      ctx.canvas.appendNode({
        type: (s.type as string) || '',
        label: (s.label as string) || '',
        params: (s.params as Record<string, unknown>) || {},
      })
    }

    return {
      success: true,
      data: {
        count: steps.length,
        message: `成功往 React Flow 画布中追加了 ${steps.length} 个节点。`,
      },
    }
  },
})

/** 清空画布（保留触发器节点） */
export const clearWorkflowCanvasTool = defineTool({
  name: 'clear_workflow_canvas',
  description: '清除当前画布上除触发器外的全部节点，用于重新覆盖生成工作流。',
  paramSchema: { type: 'object', properties: {} },
  requiresDevice: false,
  execute: async (_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
    ctx.canvas.clearCanvas()
    return { success: true, data: { message: '画布已成功清空并重置为首个触发器节点。' } }
  },
})
