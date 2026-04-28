import type { ComponentType } from "react"

// ─── Node components ─────────────────────────────────────
import { WebhookTriggerNode } from "./trigger/webhook-trigger-node"

import { AppLaunchNode }     from "./app-ui/app-launch-node"
import { AppCloseNode }      from "./app-ui/app-close-node"
import { UIClickNode }       from "./app-ui/ui-click-node"
import { UIDoubleClickNode } from "./app-ui/ui-double-click-node"
import { UISwipeNode }       from "./app-ui/ui-swipe-node"
import { UIInputNode }       from "./app-ui/ui-input-node"
import { UIWaitNode }        from "./app-ui/ui-wait-node"

import { ApiHttpNode }    from "./api/api-http-node"
import { ApiNotifyNode }  from "./api/api-notify-node"

import { DbQueryNode }   from "./data/db-query-node"
import { DbExecuteNode } from "./data/db-execute-node"

import { AssertTextNode }   from "./assert/assert-text-node"
import { AssertExistsNode } from "./assert/assert-exists-node"
import { AssertAINode }     from "./assert/assert-ai-node"

// ─── Panel components ─────────────────────────────────────
import { WebhookTriggerPanel } from "./panels/webhook-trigger-panel"

import { AppLaunchPanel }     from "./panels/app-launch-panel"
import { AppClosePanel }      from "./panels/app-close-panel"
import { UIClickPanel }       from "./panels/ui-click-panel"
import { UIDoubleClickPanel } from "./panels/ui-double-click-panel"
import { UISwipePanel }       from "./panels/ui-swipe-panel"
import { UIInputPanel }       from "./panels/ui-input-panel"
import { UIWaitPanel }        from "./panels/ui-wait-panel"

import { ApiHttpPanel }   from "./panels/api-http-panel"
import { ApiNotifyPanel } from "./panels/api-notify-panel"

import { DbQueryPanel }   from "./panels/db-query-panel"
import { DbExecutePanel } from "./panels/db-execute-panel"

import { AssertTextPanel }   from "./panels/assert-text-panel"
import { AssertExistsPanel } from "./panels/assert-exists-panel"
import { AssertAIPanel }     from "./panels/assert-ai-panel"

import type { NodeKind, AnyNodeData } from "./types"

// ─── ReactFlow nodeTypes 注册表 ───────────────────────────
export const nodeTypes = {
  webhookTrigger: WebhookTriggerNode,
  appLaunch:      AppLaunchNode,
  appClose:       AppCloseNode,
  uiClick:        UIClickNode,
  uiDoubleClick:  UIDoubleClickNode,
  uiSwipe:        UISwipeNode,
  uiInput:        UIInputNode,
  uiWait:         UIWaitNode,
  apiHttp:        ApiHttpNode,
  apiNotify:      ApiNotifyNode,
  dbQuery:        DbQueryNode,
  dbExecute:      DbExecuteNode,
  assertText:     AssertTextNode,
  assertExists:   AssertExistsNode,
  assertAI:       AssertAINode,
} as const

// ─── 配置面板注册表 ────────────────────────────────────────
export type PanelProps = {
  node: { id: string; type: string; data: AnyNodeData }
  onUpdate: (id: string, data: Partial<AnyNodeData>) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const configPanelRegistry: Record<NodeKind, ComponentType<any>> = {
  webhookTrigger: WebhookTriggerPanel,
  appLaunch:      AppLaunchPanel,
  appClose:       AppClosePanel,
  uiClick:        UIClickPanel,
  uiDoubleClick:  UIDoubleClickPanel,
  uiSwipe:        UISwipePanel,
  uiInput:        UIInputPanel,
  uiWait:         UIWaitPanel,
  apiHttp:        ApiHttpPanel,
  apiNotify:      ApiNotifyPanel,
  dbQuery:        DbQueryPanel,
  dbExecute:      DbExecutePanel,
  assertText:     AssertTextPanel,
  assertExists:   AssertExistsPanel,
  assertAI:       AssertAIPanel,
}
