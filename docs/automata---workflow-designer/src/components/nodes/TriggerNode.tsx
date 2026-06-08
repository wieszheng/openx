import React from 'react';
import { BaseNodeLayout } from './BaseNodeLayout';
import { CustomNodeProps, TriggerNodeData } from '@/src/types';
import { useReactFlow } from '@xyflow/react';

export function TriggerNode({ id, data, selected }: CustomNodeProps<TriggerNodeData>) {
  const { updateNodeData } = useReactFlow();

  const handleEventChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, {
      config: { ...(data.config || {}), event_name: e.target.value },
      isConfigured: true
    });
  };

  return (
    <BaseNodeLayout 
      id={id}
      data={data} 
      selected={selected} 
      type="trigger" 
      statusColor="bg-indigo-500"
      statusText="Trigger"
      iconColorClass="bg-indigo-50 text-indigo-600 border-indigo-100"
    >
      <div className="flex flex-col gap-1.5 nodrag">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest pl-1">Event Name</label>
        <input 
          type="text"
          placeholder="e.g. order.created"
          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-mono text-indigo-600 shadow-sm"
          value={data.config?.event_name || ''}
          onChange={handleEventChange}
        />
      </div>
    </BaseNodeLayout>
  );
}
