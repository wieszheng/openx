import { Node, Edge } from '@xyflow/react';

export type NodeType = 'trigger' | 'action' | 'condition';

export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  icon: string;
  color?: string;
  colorClass?: string;
  isConfigured?: boolean;
  executionState?: 'idle' | 'running' | 'success' | 'failed';
}

export interface TriggerNodeData extends BaseNodeData {
  triggerType: 'webhook' | 'schedule' | 'event';
  config: Record<string, string>;
}

export interface ActionNodeData extends BaseNodeData {
  actionType: 'email' | 'http' | 'slack';
  config: Record<string, string>;
}

export interface ConditionNodeData extends BaseNodeData {
  conditionType: 'equals' | 'contains' | 'greaterThan';
  field?: string;
  value?: string;
}

export type AutomataNode = Node<TriggerNodeData | ActionNodeData | ConditionNodeData>;

export interface CustomNodeProps<T extends BaseNodeData> {
  id: string;
  data: T;
  isConnectable: boolean;
  selected?: boolean;
}
