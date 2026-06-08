import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';
import { AutomataNode } from '../types';
import { Edge } from '@xyflow/react';

interface AiGeneratePanelProps {
  onClose: () => void;
  onImport: (nodes: AutomataNode[], edges: Edge[]) => void;
}

export function AiGeneratePanel({ onClose, onImport }: AiGeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  
  const endOfStreamRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setStreamingResponse('');
    setGeneratedWorkflow(null);
    
    try {
      const res = await fetch('/api/generate-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      let done = false;
      let textBuffer = '';
      
      while (reader && !done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          textBuffer += chunk;
          setStreamingResponse(textBuffer);
        }
      }
      
      try {
        const json = JSON.parse(textBuffer);
        setGeneratedWorkflow(json);
      } catch(e) {
        console.error('Failed to parse final JSON', e);
      }
      
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (endOfStreamRef.current) {
      endOfStreamRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingResponse]);

  const handleImport = () => {
    if (!generatedWorkflow) return;
    
    // Convert logic
    const { nodes: aiNodes, edges: aiEdges } = generatedWorkflow;
    
    // Auto layout simple calculation
    const flowNodes: AutomataNode[] = aiNodes.map((n: any, i: number) => {
      let nodeData = { ...n.data, isConfigured: true, executionState: 'idle' };
      
      if (n.type === 'trigger') {
         nodeData.triggerType = n.data.subType || 'webhook';
      } else if (n.type === 'action') {
         nodeData.actionType = n.data.subType || 'http';
      } else if (n.type === 'condition') {
         nodeData.conditionType = n.data.subType || 'equals';
      }
      
      return {
        id: `ai-node-${i}`,
        type: n.type,
        data: nodeData,
        position: { x: 250 + (i % 3) * 350, y: 100 + Math.floor(i / 3) * 200 } // Basic layout
      };
    });
    
    const flowEdges: Edge[] = (aiEdges || []).map((e: any, i: number) => ({
      id: `ai-edge-${i}`,
      source: `ai-node-${e.sourceIndex}`,
      target: `ai-node-${e.targetIndex}`,
      sourceHandle: e.sourceHandle || null,
      animated: false,
      style: { stroke: '#94a3b8', strokeWidth: 2 }
    }));

    onImport(flowNodes, flowEdges);
    onClose();
  };

  return (
    <div className="absolute top-4 right-4 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 text-indigo-600">
          <Icons.Sparkles size={18} />
          <h3 className="font-semibold text-sm">AI Copilot</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors">
          <Icons.X size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Input Area */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Prompt</label>
          <textarea 
            className="w-full text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none min-h-[100px] shadow-sm bg-slate-50"
            placeholder="e.g. When a new user signs up, send them a welcome email. If they are a pro user, notify slack."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-1 shadow-md shadow-indigo-100"
          >
            {isGenerating ? <Icons.Loader2 size={16} className="animate-spin" /> : <Icons.Zap size={16} />}
            {isGenerating ? 'Generating...' : 'Generate Workflow'}
          </button>
        </div>

        {/* Streaming Output Area */}
        <div className="flex flex-col gap-2 flex-1 min-h-[200px]">
           <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-between">
              Output Stream
              {isGenerating && <span className="flex items-center gap-1 text-indigo-500"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span> Receiving</span>}
           </label>
           <div className="flex-1 bg-slate-900 rounded-lg p-3 overflow-y-auto text-xs font-mono text-emerald-400 shadow-inner break-all whitespace-pre-wrap leading-relaxed min-h-[200px] max-h-[300px]">
             {streamingResponse || <span className="text-slate-600">Waiting for input...</span>}
             <div ref={endOfStreamRef} />
           </div>
        </div>
      </div>
      
      {/* Action Area */}
      {generatedWorkflow && (
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
           <button 
            onClick={() => { setStreamingResponse(''); setGeneratedWorkflow(null); handleGenerate(); }}
            className="flex-1 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
           >
             Regenerate
           </button>
           <button 
            onClick={handleImport}
            className="flex-[2] py-2 text-xs font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 shadow-md transition-colors flex items-center justify-center gap-1.5"
           >
             <Icons.Download size={14} />
             Import to Canvas
           </button>
        </div>
      )}
    </div>
  );
}
