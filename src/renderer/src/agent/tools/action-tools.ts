/**
 * 实机动作工具
 *
 * 在真实连接设备上即时运行测试操作的工具：
 * - run_live_action：在设备上执行单个动作（点击/滑动/输入等）
 */

import { defineTool } from './define-tool'
import type { ToolContext } from './tool-types'
import type { ToolResult } from '../core/types'
import type { WorkflowNodeType } from '../../../../shared/workflow'
import { nanoid } from 'nanoid'

/** 在真实设备上即时运行测试操作 */
export const runLiveActionTool = defineTool({
  name: 'run_live_action',
  description:
    '在真实连接设备上即时运行一个测试操作（如点击、滑动、打字、等待），可在插入画布前验证操作是否正确。',
  paramSchema: {
    type: 'object',
    properties: {
      actionType: {
        type: 'string',
        description: '动作类型',
        enum: [
          'action-launch-app',
          'action-close-app',
          'action-tap',
          'action-double-tap',
          'action-long-click',
          'action-swipe',
          'action-drag',
          'action-input-text',
          'action-clear-text',
          'action-key-event',
          'control-delay',
        ],
      },
      params: {
        type: 'object',
        description: '动作对应的配置参数',
      },
    },
    required: ['actionType', 'params'],
  },
  requiresDevice: true,
  execute: async (args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
    const { actionType, params } = args as {
      actionType: string
      params?: Record<string, unknown>
    }

    const testNode = {
      id: nanoid(),
      type: actionType as WorkflowNodeType,
      label: `实机测试-${actionType}`,
      params: params || {},
      position: { x: 0, y: 0 },
    }

    const res = await window.api.workflow.runNode({
      node: testNode,
      deviceId: ctx.deviceId!,
      baseUrl: ctx.baseUrl,
    })

    if (res.ok) {
      return {
        success: true,
        data: { info: `实机动作 [${actionType}] 已成功在物理设备上试运行。` },
      }
    }
    return { success: false, error: `实机试运行失败: ${res.error}` }
  },
})
