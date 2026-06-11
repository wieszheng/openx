import { create } from 'zustand'

import type {

  AgentEvent,

  AgentRunMode,

  AgentRunSummary,

  AgentStatus,

  AssertionResult,

  Checkpoint,

  RepairProposal,

  StepAssertion,

  WorkflowDraft,

} from '../../../shared/agent'



interface AgentStore {

  status: AgentStatus

  mode: AgentRunMode

  checkpoints: Checkpoint[]

  summary: AgentRunSummary | null

  pausedReason: string | null

  breakpoints: Set<string>

  selectedCheckpointId: string | null

  autoRepair: boolean



  planning: boolean

  draft: WorkflowDraft | null

  stepAssertions: Record<string, StepAssertion[]>

  acceptanceCriteria: StepAssertion[]

  assertionResults: Record<string, AssertionResult[]>

  activeTab: 'plan' | 'run'

  planThinkLogs: string[]

  planStreamText: string

  lastRepairProposal: RepairProposal | null

  repairHistory: RepairProposal[]

  lastRepairFailed: string | null



  setMode: (mode: AgentRunMode) => void

  setActiveTab: (tab: 'plan' | 'run') => void

  setAutoRepair: (v: boolean) => void

  toggleBreakpoint: (nodeId: string) => void

  clearBreakpoints: () => void

  selectCheckpoint: (nodeId: string | null) => void

  setDraft: (draft: WorkflowDraft | null) => void

  setPlanning: (v: boolean) => void

  handleEvent: (event: AgentEvent) => void

  reset: () => void

}



export const useAgentStore = create<AgentStore>((set, get) => ({

  status: 'idle',

  mode: 'debug',

  checkpoints: [],

  summary: null,

  pausedReason: null,

  breakpoints: new Set(),

  selectedCheckpointId: null,

  autoRepair: true,

  planning: false,

  draft: null,

  stepAssertions: {},

  acceptanceCriteria: [],

  assertionResults: {},

  activeTab: 'plan',

  planThinkLogs: [],

  planStreamText: '',

  lastRepairProposal: null,

  repairHistory: [],

  lastRepairFailed: null,



  setMode: (mode) => set({ mode }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setAutoRepair: (v) => set({ autoRepair: v }),



  toggleBreakpoint: (nodeId) => {

    const next = new Set(get().breakpoints)

    if (next.has(nodeId)) next.delete(nodeId)

    else next.add(nodeId)

    set({ breakpoints: next })

  },



  clearBreakpoints: () => set({ breakpoints: new Set() }),



  selectCheckpoint: (nodeId) => set({ selectedCheckpointId: nodeId }),



  setDraft: (draft) => set({

    draft,

    stepAssertions: draft?.stepAssertions ?? {},

    acceptanceCriteria: draft?.acceptanceCriteria ?? [],

  }),



  setPlanning: (v) => set({ planning: v }),



  handleEvent: (event) => {

    switch (event.type) {

      case 'status':

        set({ status: event.status, pausedReason: event.status === 'paused' ? get().pausedReason : null })

        if (event.mode) set({ mode: event.mode })

        break

      case 'step_start':

        set({ pausedReason: null })

        break

      case 'step_end':

        set((s) => ({

          checkpoints: [...s.checkpoints, event.checkpoint],

          selectedCheckpointId: event.checkpoint.nodeId,

        }))

        break

      case 'assertion_result':

        set((s) => ({

          assertionResults: { ...s.assertionResults, [event.nodeId]: event.results },

        }))

        break

      case 'paused':

        set({ status: 'paused', pausedReason: event.reason })

        break

      case 'repair_start':

        set({ lastRepairFailed: null })

        break

      case 'repair_proposal':

        set({ lastRepairProposal: event.proposal })

        break

      case 'repair_applied':

        set((s) => ({

          lastRepairProposal: event.proposal,

          repairHistory: [...s.repairHistory, event.proposal],

        }))

        break

      case 'repair_failed':

        set({ lastRepairFailed: event.reason, lastRepairProposal: null })

        break

      case 'workflow_patched':

        break

      case 'plan_start':

        set({ planning: true, planThinkLogs: [], planStreamText: '' })

        break

      case 'plan_stream_init':

        break

      case 'plan_think':

        if (event.kind === 'info') {

          set((s) => ({ planThinkLogs: [...s.planThinkLogs, event.message] }))

        } else if (event.kind === 'stream') {

          set((s) => ({ planStreamText: s.planStreamText + event.delta }))

        } else if (event.kind === 'stream_reset') {

          set({ planStreamText: '' })

        }

        break

      case 'plan_done':

        set({

          planning: false,

          draft: event.draft,

          stepAssertions: event.draft.stepAssertions,

          acceptanceCriteria: event.draft.acceptanceCriteria,

          activeTab: 'plan',

          planThinkLogs: [...get().planThinkLogs, `✓ 已生成 ${event.draft.steps.length} 步，流式应用到画布`],

        })

        break

      case 'plan_error':

        set({

          planning: false,

          pausedReason: event.message,

          planThinkLogs: [...get().planThinkLogs, `✗ ${event.message}`],

        })

        break

      case 'done':

        set({

          status: event.summary.status === 'done' ? 'done' : event.summary.status === 'stopped' ? 'stopped' : 'failed',

          summary: event.summary,

          pausedReason: null,

        })

        break

      case 'error':

        set({ status: 'failed', pausedReason: event.message })

        break

    }

  },



  reset: () => set({

    status: 'idle',

    checkpoints: [],

    summary: null,

    pausedReason: null,

    selectedCheckpointId: null,

    assertionResults: {},

    lastRepairProposal: null,

    repairHistory: [],

    lastRepairFailed: null,

  }),

}))


