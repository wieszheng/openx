import { BaseNodeLayout } from './BaseNodeLayout';
import { CustomNodeProps, ActionNodeData } from '@/src/types';
import { useReactFlow } from '@xyflow/react';

export function ActionNode({ id, data, selected }: CustomNodeProps<ActionNodeData>) {
  const { updateNodeData } = useReactFlow();

  return (
    <BaseNodeLayout 
      id={id}
      data={data} 
      selected={selected} 
      type="action"
      statusColor="bg-sky-500"
      statusText="Action"
      iconColorClass={`${data.colorClass} border-slate-100/50`}
    >
      {data.actionType === 'email' ? (
        <div className="flex flex-col gap-3 nodrag">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest pl-1">Recipient</label>
            <input 
              type="text"
              placeholder="user@example.com"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all text-slate-700 shadow-sm"
              value={data.config?.to || ''}
              onChange={(e) => updateNodeData(id, { config: { ...data.config, to: e.target.value }, isConfigured: true })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest pl-1">Subject</label>
            <input 
              type="text"
              placeholder="Order complete"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all text-slate-700 shadow-sm"
              value={data.config?.subject || ''}
              onChange={(e) => updateNodeData(id, { config: { ...data.config, subject: e.target.value }, isConfigured: true })}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 nodrag">
           <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest pl-1">Endpoint URL</label>
            <input 
              type="text"
              placeholder="https://api.example.com"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all text-slate-700 shadow-sm"
              value={data.config?.url || ''}
              onChange={(e) => updateNodeData(id, { config: { ...data.config, url: e.target.value }, isConfigured: true })}
            />
        </div>
      )}
    </BaseNodeLayout>
  );
}
