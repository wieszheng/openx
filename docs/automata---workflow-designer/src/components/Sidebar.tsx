import React, { useState } from 'react';
import * as Icons from 'lucide-react';

const NODE_TYPES = [
  {
    type: 'trigger',
    label: 'Webhook Trigger',
    icon: 'Radio',
    colorClass: 'bg-indigo-50 text-indigo-600',
    defaultData: {
      triggerType: 'webhook',
      config: {}
    }
  },
  {
    type: 'trigger',
    label: 'Schedule',
    icon: 'Clock',
    colorClass: 'bg-purple-50 text-purple-600',
    defaultData: {
      triggerType: 'schedule',
      config: {}
    }
  },
  {
    type: 'action',
    label: 'Send Email',
    icon: 'Mail',
    colorClass: 'bg-blue-50 text-blue-600',
    defaultData: {
      actionType: 'email',
      config: {}
    }
  },
  {
    type: 'action',
    label: 'HTTP Request',
    icon: 'Globe',
    colorClass: 'bg-green-50 text-green-600',
    defaultData: {
      actionType: 'http',
      config: {}
    }
  },
  {
    type: 'action',
    label: 'Slack Message',
    icon: 'MessageSquare',
    colorClass: 'bg-emerald-50 text-emerald-600',
    defaultData: {
      actionType: 'slack',
      config: {}
    }
  },
  {
    type: 'condition',
    label: 'If / Else',
    icon: 'GitBranch',
    colorClass: 'bg-orange-50 text-orange-600',
    defaultData: {
      conditionType: 'equals'
    }
  }
];

export function Sidebar() {
  const [search, setSearch] = useState('');

  const onDragStart = (event: React.DragEvent, nodeConfig: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeConfig));
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredNodes = NODE_TYPES.filter(n => n.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-10 shrink-0">
      <div className="p-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search nodes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50"
          />
          <Icons.Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {(['trigger', 'action', 'condition'] as const).map((typeCategory) => {
          const nodes = filteredNodes.filter(n => n.type === typeCategory);
          if (nodes.length === 0) return null;
          
          return (
            <section key={typeCategory}>
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                {typeCategory}s
              </h2>
              <div className="space-y-2">
                {nodes.map((node, i) => {
                  const Icon = (Icons as any)[node.icon] || Icons.HelpCircle;
                  return (
                    <div
                      key={i}
                      draggable
                      onDragStart={(e) => onDragStart(e, { ...node, colorClass: node.colorClass })}
                      className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm cursor-grab hover:border-indigo-300 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${node.colorClass}`}>
                        <Icon strokeWidth={2} className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-slate-700">{node.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
