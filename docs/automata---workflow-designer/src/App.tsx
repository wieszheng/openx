import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  NodeTypes,
} from '@xyflow/react';

import { TriggerNode } from './components/nodes/TriggerNode';
import { ActionNode } from './components/nodes/ActionNode';
import { ConditionNode } from './components/nodes/ConditionNode';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AiGeneratePanel } from './components/AiGeneratePanel';
import { AutomataNode } from './types';

// Register custom node types
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
};

const initialNodes: AutomataNode[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 250, y: 100 },
    data: { 
      label: 'Webhook Trigger', 
      description: 'Start flow on HTTP request',
      icon: 'Radio',
      color: '#8b5cf6',
      colorClass: 'bg-indigo-50 text-indigo-600',
      triggerType: 'webhook',
      config: { event_name: 'user.signup' },
      isConfigured: true
    },
  },
];

const initialEdges: Edge[] = [];

let idCtr = 1;
const getId = () => `node-${idCtr++}`;

function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  const runWorkflow = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);

    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    // Reset execution state
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, executionState: 'idle' } }))
    );
    setEdges((eds) =>
      eds.map((e) => ({ ...e, animated: false, style: { ...e.style, stroke: '#e2e8f0', strokeWidth: 2 } }))
    );

    let activeNodes = currentNodes.filter((n) => n.type === 'trigger').map((n) => n.id);

    while (activeNodes.length > 0) {
      // Mark active ones as running
      setNodes((nds) =>
        nds.map((n) =>
          activeNodes.includes(n.id)
            ? { ...n, data: { ...n.data, executionState: 'running' } }
            : n
        )
      );

      // Simulate work for current nodes
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mark active ones as success
      setNodes((nds) =>
        nds.map((n) =>
          activeNodes.includes(n.id)
            ? { ...n, data: { ...n.data, executionState: 'success' } }
            : n
        )
      );

      // Find next active nodes
      const nextActiveNodes: string[] = [];
      const edgesFromActive = currentEdges.filter((e) => activeNodes.includes(e.source));
      const activeEdgeIds: string[] = [];

      const sourcesProcessed = new Set<string>();

      for (const edge of edgesFromActive) {
        const sourceNode = currentNodes.find((n) => n.id === edge.source);
        if (sourceNode?.type === 'condition') {
          if (!sourcesProcessed.has(edge.source)) {
            sourcesProcessed.add(edge.source);
            // Decide true or false path randomly for demo
            const takenPath = Math.random() > 0.5 ? 'true' : 'false';
            const matchedEdge = edgesFromActive.find(
              (e) => e.source === edge.source && e.sourceHandle === takenPath
            );
            if (matchedEdge) {
              nextActiveNodes.push(matchedEdge.target);
              activeEdgeIds.push(matchedEdge.id);
            }
          }
        } else {
          nextActiveNodes.push(edge.target);
          activeEdgeIds.push(edge.id);
        }
      }

      if (activeEdgeIds.length > 0) {
        // Animate the edges to show data flowing
        setEdges((eds) =>
          eds.map((e) =>
            activeEdgeIds.includes(e.id)
              ? { ...e, animated: true, style: { ...e.style, stroke: '#6366f1', strokeWidth: 3 } }
              : e
          )
        );
        await new Promise((resolve) => setTimeout(resolve, 800));

        // After flowing, mark edges as complete
        setEdges((eds) =>
          eds.map((e) =>
            activeEdgeIds.includes(e.id)
              ? { ...e, animated: false, style: { ...e.style, stroke: '#10b981', strokeWidth: 2 } }
              : e
          )
        );
      }

      activeNodes = [...new Set(nextActiveNodes)];
    }

    setIsRunning(false);

    // Auto clear after 4s
    setTimeout(() => {
      setNodes((nds) =>
        nds.map((n) => ({ ...n, data: { ...n.data, executionState: 'idle' } }))
      );
      setEdges((eds) =>
        eds.map((e) => ({ ...e, animated: false, style: { ...e.style, stroke: e.sourceHandle === 'true' ? '#22c55e' : '#94a3b8', strokeWidth: 2 } }))
      );
    }, 4000);
  }, [isRunning, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      let animated = true;
      let stroke = '#94a3b8'; // slate-400
      
      if (params.sourceHandle === 'true') {
        stroke = '#22c55e'; // green-500
      } else if (params.sourceHandle === 'false') {
        stroke = '#94a3b8'; // slate-400
      }

      const newEdge = { 
        ...params, 
        animated, 
        style: { stroke, strokeWidth: 2 } 
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const typeDataString = event.dataTransfer.getData('application/reactflow');
      if (!typeDataString) return;

      const nodeConfig = JSON.parse(typeDataString);

      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: AutomataNode = {
        id: getId(),
        type: nodeConfig.type,
        position,
        data: { 
          ...nodeConfig.defaultData,
          label: nodeConfig.label,
          description: nodeConfig.description,
          icon: nodeConfig.icon,
          color: nodeConfig.color,
          colorClass: nodeConfig.colorClass,
          isConfigured: false
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const handleImportAiWorkflow = useCallback((newNodes: AutomataNode[], newEdges: Edge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
    
    // Fit view after a tick
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 2, duration: 500 });
      }
    }, 100);
  }, [setNodes, setEdges, reactFlowInstance]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      <TopBar 
        onRun={runWorkflow} 
        isRunning={isRunning} 
        onToggleAiPanel={() => setIsAiPanelOpen(!isAiPanelOpen)} 
      />

      <main className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <div className="flex-1 relative bg-slate-100 overflow-hidden" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 2 }}
            proOptions={{ hideAttribution: true }}
            className="[&_.react-flow__background]:bg-slate-100"
          >
            <Background gap={20} size={1} color="#cbd5e1" />
            <Controls className="fill-slate-600 bg-white border-slate-200 shadow-xl rounded-lg overflow-hidden m-4" />
          </ReactFlow>
          {isAiPanelOpen && (
            <AiGeneratePanel 
              onClose={() => setIsAiPanelOpen(false)} 
              onImport={handleImportAiWorkflow} 
            />
          )}
        </div>
      </main>

      <footer className="h-8 bg-slate-900 text-slate-400 text-[10px] px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span>System Online</span>
          </div>
          <div className="h-3 w-px bg-slate-700"></div>
          <span>Production Environment</span>
        </div>
        <div className="flex items-center gap-4">
          <span>v2.4.1-stable</span>
          <span>Shift + K for shortcuts</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
