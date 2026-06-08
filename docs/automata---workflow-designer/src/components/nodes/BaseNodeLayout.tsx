import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/src/lib/utils';
import * as Icons from 'lucide-react';

interface BaseNodeLayoutProps {
  id: string;
  data: any;
  selected?: boolean;
  type: 'trigger' | 'action' | 'condition';
  children?: React.ReactNode;
  statusColor?: string;
  statusText?: string;
  iconColorClass?: string;
}

export function BaseNodeLayout({ id, data, selected, type, children, statusColor, statusText, iconColorClass }: BaseNodeLayoutProps) {
  const IconComponent = (Icons as any)[data.icon] || Icons.HelpCircle;

  return (
    <div className={cn(
      "group relative flex w-[300px] flex-col transition-all duration-300 isolate",
      selected && data.executionState !== 'running' && "z-10",
      data.executionState === 'running' && "running-node-fx z-20"
    )}>
      
      {/* Flowing border container */}
      {data.executionState === 'running' && (
         <div className="absolute -inset-[2px] rounded-[18px] overflow-hidden pointer-events-none -z-10">
            <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] animate-spin-slow bg-[conic-gradient(from_0deg,transparent_70%,rgba(129,140,248,1)_85%,rgba(96,165,250,1)_100%)]"></div>
         </div>
      )}

      {/* Main Node Card */}
      <div
        className={cn(
          "relative flex w-full flex-col rounded-2xl border transition-all duration-300",
          data.executionState === 'running' ? "bg-white border-transparent" : "bg-white/95 backdrop-blur-md border-slate-200/80 hover:border-slate-300 hover:shadow-md",
          selected && data.executionState !== 'running' ? "border-indigo-400 shadow-xl ring-4 ring-indigo-500/10" : "",
          data.executionState === 'success' && "bg-white/95 ring-4 ring-emerald-500/20 shadow-emerald-500/10 shadow-xl border-emerald-300",
          data.executionState === 'failed' && "bg-white/95 ring-4 ring-rose-500/20 shadow-rose-500/10 shadow-xl border-rose-300"
        )}
      >
        {data.executionState === 'success' && (
          <div className="absolute inset-x-0 -top-px h-1 bg-emerald-500 rounded-t-2xl z-20" />
        )}
        {data.executionState === 'failed' && (
          <div className="absolute inset-x-0 -top-px h-1 bg-rose-500 rounded-t-2xl z-20" />
        )}

        {/* Input Handle */}
      {type !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-4 !h-4 !bg-slate-50 !border-2 !border-slate-300 hover:!border-indigo-500 transition-colors !top-[-8px] !rounded-md"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100/60 transition-colors group-hover:bg-slate-50/30 rounded-t-2xl">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border", iconColorClass || "bg-slate-50 text-slate-500 border-slate-100")}>
          <IconComponent className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-bold text-slate-800 truncate leading-tight">{data.label}</p>
            {type === 'trigger' && !data.isConfigured && (
               <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate leading-tight flex items-center gap-1.5">
            <span className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0", statusColor)}></span>
            <span className="font-semibold uppercase tracking-wider text-[9px] truncate">
              {statusText || type}
            </span>
          </p>
        </div>
      </div>

      {/* Body for dynamic inputs */}
      <div className="p-4 bg-slate-50/50 rounded-b-2xl">
        {children}
      </div>

      {/* Output Handles */}
      {type === 'condition' ? (
        <>
          <div className="absolute left-[30%] -bottom-5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shadow-sm z-20">True</div>
          <Handle
            type="source"
            id="true"
            position={Position.Bottom}
            className="!w-4 !h-4 !bg-emerald-50 !border-2 !border-emerald-500 !left-[30%] !bottom-[-8px] !rounded-md z-10 hover:!scale-110 transition-transform"
          />
          <div className="absolute left-[70%] -bottom-5 text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shadow-sm z-20">False</div>
          <Handle
            type="source"
            id="false"
            position={Position.Bottom}
            className="!w-4 !h-4 !bg-slate-50 !border-2 !border-slate-400 !left-[70%] !bottom-[-8px] !rounded-md z-10 hover:!scale-110 transition-transform"
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-4 !h-4 !bg-slate-50 !border-2 !border-slate-300 hover:!border-indigo-500 transition-colors !bottom-[-8px] !rounded-md"
        />
      )}
    </div>
    </div>
  );
}
