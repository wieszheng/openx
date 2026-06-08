import React from 'react';
import * as Icons from 'lucide-react';

interface TopBarProps {
  onRun: () => void;
  isRunning?: boolean;
  onToggleAiPanel: () => void;
}

export function TopBar({ onRun, isRunning, onToggleAiPanel }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
          <Icons.Workflow size={24} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-900">Order Processing Workflow</h1>
          <p className="text-xs text-slate-500">Last updated: 2 mins ago</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleAiPanel}
          className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors flex items-center gap-2"
        >
          <Icons.Sparkles size={16} />
          Copilot
        </button>
        <div className="flex -space-x-2 mr-4 hidden sm:flex">
          <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">JD</div>
          <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">ML</div>
        </div>
        <button 
          onClick={onRun}
          disabled={isRunning}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Icons.Loader2 size={16} className="animate-spin" />
              Running
            </>
          ) : (
            'Test Run'
          )}
        </button>
        <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-colors">
          Publish
        </button>
      </div>
    </header>
  );
}
