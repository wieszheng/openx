import { BaseNodeLayout } from './BaseNodeLayout';
import { CustomNodeProps, ConditionNodeData } from '@/src/types';
import { useReactFlow } from '@xyflow/react';

export function ConditionNode({ id, data, selected }: CustomNodeProps<ConditionNodeData>) {
  const { updateNodeData } = useReactFlow();

  return (
    <BaseNodeLayout 
      id={id}
      data={data} 
      selected={selected} 
      type="condition"
      statusColor="bg-orange-500"
      statusText="Condition"
      iconColorClass="bg-orange-50 text-orange-600 border-orange-100"
    >
      <div className="flex flex-col gap-3 nodrag">
        <div className="flex gap-2">
          <div className="flex flex-col gap-1.5 flex-1 w-3/5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest pl-1">Variable</label>
            <input 
              type="text"
              placeholder="e.g. amount"
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all font-mono text-orange-600 shadow-sm"
              value={data.field || ''}
              onChange={(e) => updateNodeData(id, { field: e.target.value, isConfigured: true })}
            />
          </div>
          <div className="flex flex-col gap-1.5 w-2/5">
             <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest pl-1">Op</label>
             <select 
               className="w-full px-1 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 appearance-none shadow-sm text-center font-bold text-slate-600"
               value={data.conditionType || 'equals'}
               onChange={(e) => updateNodeData(id, { conditionType: e.target.value, isConfigured: true })}
             >
               <option value="equals">==</option>
               <option value="greaterThan">&gt;</option>
               <option value="contains">in</option>
             </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest pl-1">Value</label>
          <input 
            type="text"
            placeholder="e.g. 100"
            className="w-full px-3 py-2 text-[13px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-slate-800 font-semibold shadow-sm"
            value={data.value || ''}
            onChange={(e) => updateNodeData(id, { value: e.target.value, isConfigured: true })}
          />
        </div>
      </div>
    </BaseNodeLayout>
  );
}
