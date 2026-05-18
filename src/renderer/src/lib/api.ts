export const BASE_URL = "http://127.0.0.1:8000"

/** 携带 HTTP 状态码，便于区分 404 与网络/服务器错误 */
export class HttpError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(message: string, status: number, detail?: unknown) {
    super(message)
    this.name = "HttpError"
    this.status = status
    this.detail = detail
  }
}

/** 解析脚本/运行校验类 422（detail 为 { errors, warnings }） */
export function formatFlowValidationError(e: unknown): string {
  if (
    e instanceof HttpError &&
    e.status === 422 &&
    e.detail &&
    typeof e.detail === "object" &&
    !Array.isArray(e.detail)
  ) {
    const d = e.detail as { errors?: unknown[]; warnings?: unknown[] }
    const errs = Array.isArray(d.errors) ? d.errors.map(String) : []
    const warns = Array.isArray(d.warnings) ? d.warnings.map(String) : []
    const parts: string[] = []
    if (errs.length) parts.push(errs.join("\n"))
    if (warns.length) parts.push(`提示：\n${warns.join("\n")}`)
    if (parts.length) return parts.join("\n\n")
  }
  return e instanceof Error ? e.message : String(e)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const raw = (err as { detail?: unknown }).detail
    const msg =
      typeof raw === "string"
        ? raw
        : raw !== undefined
          ? JSON.stringify(raw)
          : `HTTP ${res.status}`
    throw new HttpError(msg, res.status, raw)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Types ─────────────────────────────────────────────────────────────────

export type Group = {
  id: number
  name: string
}

export type Directory = {
  id: string
  name: string
  group_id: number
  parent_id: string | null
  path: string
  sort_order: number
  created_at: string
}

export type CaseType =
  | "api"
  | "ui"
  | "mixed"
  | "integration"
  | "performance"

export type TestCase = {
  id: string
  name: string
  directory_id: string | null
  case_type: CaseType
  description: string
  priority: "P0" | "P1" | "P2" | "P3"
  tags: string[]
  status: "正常运行" | "调试中" | "已停用"
  preconditions: string
  steps_manual: Record<string, unknown>[]
  expected_result: string
  is_automated: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  version: number
  is_deleted: boolean
}

export type PaginatedTestCases = {
  total: number
  page: number
  page_size: number
  items: TestCase[]
}

// ── Groups API ────────────────────────────────────────────────────────────

export const groupsApi = {
  list: () =>
    request<Group[]>("/api/groups"),

  create: (name: string) =>
    request<Group>("/api/groups", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  rename: (id: number, name: string) =>
    request<Group>(`/api/groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  delete: (id: number) =>
    request<void>(`/api/groups/${id}`, { method: "DELETE" }),
}

// ── Directories API ───────────────────────────────────────────────────────

export const directoriesApi = {
  list: (group_id?: number, parent_id?: string) => {
    const params = new URLSearchParams()
    if (group_id !== undefined) params.set("group_id", String(group_id))
    if (parent_id !== undefined) params.set("parent_id", parent_id)
    return request<Directory[]>(`/api/directories?${params}`)
  },

  create: (data: { name: string; group_id: number; parent_id?: string }) =>
    request<Directory>("/api/directories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  rename: (id: string, name: string) =>
    request<Directory>(`/api/directories/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  delete: (id: string) =>
    request<void>(`/api/directories/${id}`, { method: "DELETE" }),
}

// ── Cases API ─────────────────────────────────────────────────────────────

export type CaseListParams = {
  keyword?: string
  case_type?: string
  owner?: string
  priority?: string
  is_automated?: boolean
  page?: number
  page_size?: number
}

export type Script = {
  id: string
  case_id: string
  nodes: Record<string, unknown>[]
  edges: Record<string, unknown>[]
  timeout_ms: number
  retry_count: number
  version: number
  updated_at: string
  /** 拓扑与执行策略提示（多入口、孤立节点、无效边等） */
  flow_warnings?: string[]
}

export type ScriptSave = {
  nodes: Record<string, unknown>[]
  edges: Record<string, unknown>[]
  timeout_ms?: number
  retry_count?: number
}

export const scriptsApi = {
  get: (caseId: string) =>
    request<Script>(`/api/cases/${caseId}/script`),

  /** 无脚本时后端返回 404 → `null`；其它状态仍抛错 */
  tryGet: async (caseId: string): Promise<Script | null> => {
    try {
      return await request<Script>(`/api/cases/${caseId}/script`)
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) return null
      throw e
    }
  },

  save: (caseId: string, data: ScriptSave) =>
    request<Script>(`/api/cases/${caseId}/script`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (caseId: string) =>
    request<void>(`/api/cases/${caseId}/script`, { method: "DELETE" }),
}

export const casesApi = {
  get: (id: string) =>
    request<TestCase>(`/api/cases/${id}`),

  list: (directoryId: string, params?: CaseListParams) => {
    const q = new URLSearchParams()
    if (params?.keyword) q.set("keyword", params.keyword)
    if (params?.case_type) q.set("case_type", params.case_type)
    if (params?.owner) q.set("owner", params.owner)
    if (params?.priority) q.set("priority", params.priority)
    if (params?.is_automated !== undefined) q.set("is_automated", String(params.is_automated))
    if (params?.page) q.set("page", String(params.page))
    if (params?.page_size) q.set("page_size", String(params.page_size))
    return request<PaginatedTestCases>(`/api/directories/${directoryId}/cases?${q}`)
  },

  create: (
    directoryId: string,
    data: Pick<TestCase, "name" | "priority" | "status"> &
      Partial<
        Pick<
          TestCase,
          | "case_type"
          | "description"
          | "tags"
          | "preconditions"
          | "steps_manual"
          | "expected_result"
          | "created_by"
        >
      >,
  ) =>
    request<TestCase>(`/api/directories/${directoryId}/cases`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<
      Pick<
        TestCase,
        | "name"
        | "description"
        | "case_type"
        | "priority"
        | "tags"
        | "status"
        | "preconditions"
        | "steps_manual"
        | "expected_result"
        | "is_automated"
      >
    >,
  ) =>
    request<TestCase>(`/api/cases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/cases/${id}`, { method: "DELETE" }),
}

// ── Runs API ───────────────────────────────────────────────────────────────

export type RunStatus = "pending" | "running" | "passed" | "failed" | "error" | "cancelled"
export type NodeExecStatus = "pending" | "running" | "passed" | "failed" | "skipped"

/** SSE 推流事件联合类型 */
export type SseEvent =
  | { type: "heartbeat" }
  | { type: "subscribed" }
  | { type: "flow_warnings"; warnings: string[] }
  | { type: "node_status"; node_id: string; node_type: string; label: string; status: "running"; start_lines: string[] }
  | { type: "node_status"; node_id: string; node_type: string; label: string; status: "passed" | "failed" | "skipped"; duration_ms: number; end_lines: string[] }
  | { type: "done"; status: string; duration_ms: number }
  | { type: "error"; message: string }

export type NodeResultIn = {
  node_id: string
  node_type: string
  exec_order: number
  desc: string
  status: NodeExecStatus
  output?: Record<string, unknown>
  duration_ms?: number
  error_msg?: string
}

export type NodeResultOut = NodeResultIn & {
  id: string
  run_id: string
  screenshot_url: string | null
}

export type RunOut = {
  id: string
  case_id: string
  script_id: string | null
  status: RunStatus
  script_version: number
  started_at: string | null
  ended_at: string | null
  duration_ms: number | null
  error_msg: string | null
  triggered_by: string | null
  node_results: NodeResultOut[]
}

export const runsApi = {
  create: (caseId: string, data?: { triggered_by?: string }) =>
    request<RunOut>(`/api/cases/${caseId}/runs`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),

  /** 触发后台执行，立即返回 202；重复调用为幂等 */
  execute: (runId: string) =>
    request<{
      run_id: string
      status: "started" | "already_started" | "already_finished"
      run_status?: string
    }>(`/api/runs/${runId}/execute`, {
      method: "POST",
    }),

  /**
   * 订阅 SSE 执行事件流。
   * `opened`：收到首条服务端事件（含 `subscribed`）或超时后 resolve，再调 `execute` 更可靠。
   */
  subscribe: (
    runId: string,
    onEvent: (ev: SseEvent) => void,
    onError?: () => void,
  ): { cleanup: () => void; opened: Promise<void> } => {
    const es = new EventSource(`${BASE_URL}/api/runs/${runId}/stream`)
    let readyTimeout: ReturnType<typeof setTimeout> | undefined
    let streamReadySettled = false
    let resolveOpened: () => void = () => {}
    const opened = new Promise<void>((resolve) => {
      resolveOpened = resolve
      readyTimeout = setTimeout(() => markOpened(), 2500)
    })

    function markOpened() {
      if (streamReadySettled) return
      streamReadySettled = true
      if (readyTimeout !== undefined) {
        clearTimeout(readyTimeout)
        readyTimeout = undefined
      }
      resolveOpened()
    }

    es.onmessage = (e) => {
      markOpened()
      try {
        onEvent(JSON.parse(e.data) as SseEvent)
      } catch {
        /* ignore malformed */
      }
    }

    es.onerror = () => {
      markOpened()
      onError?.()
    }

    return {
      cleanup: () => {
        markOpened()
        es.close()
      },
      opened,
    }
  },

  updateStatus: (runId: string, data: {
    status: RunStatus
    started_at?: string
    ended_at?: string
    duration_ms?: number
    error_msg?: string
  }) =>
    request<RunOut>(`/api/runs/${runId}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  reportNodes: (runId: string, results: NodeResultIn[]) =>
    request<NodeResultOut[]>(`/api/runs/${runId}/nodes`, {
      method: "POST",
      body: JSON.stringify({ results }),
    }),
}

// ── Test plans API ────────────────────────────────────────────────────────

export type PlanStatus = "active" | "inactive" | "archived"
export type PlanRunStatus = "pending" | "running" | "passed" | "failed" | "error" | "cancelled"

export type PlanPriority = "P0" | "P1" | "P2" | "P3"

export type TestPlan = {
  id: string
  name: string
  description: string
  status: PlanStatus
  cron_expr: string | null
  next_run_at: string | null
  timeout_ms: number
  priority: PlanPriority
  created_by: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
  case_count: number
}

export type PlanCreatePayload = {
  name: string
  description?: string
  status?: PlanStatus
  /** 必填，标准 cron 表达式 */
  cron_expr: string
  timeout_ms?: number
  priority?: PlanPriority
  created_by?: string | null
}

export type PlanUpdatePayload = Partial<Omit<PlanCreatePayload, "name">> & { name?: string }

export type PlanCaseRow = {
  id: string
  plan_id: string
  case_id: string
  sort_order: number
  case_name?: string | null
}

export type PlanRunRow = {
  id: string
  plan_id: string
  status: PlanRunStatus
  trigger: string
  serial: string | null
  env_vars: Record<string, unknown>
  total: number
  passed: number
  failed: number
  error: number
  pass_rate: number | null
  started_at: string | null
  ended_at: string | null
  duration_ms: number | null
  error_msg: string | null
  created_by: string | null
  plan_name: string | null
}

export type PlanRunCreatePayload = {
  trigger?: string
  serial?: string | null
  env_vars?: Record<string, unknown>
  created_by?: string | null
}

export type PaginatedPlans = {
  total: number
  page: number
  page_size: number
  items: TestPlan[]
}

export type PaginatedPlanRuns = {
  total: number
  page: number
  page_size: number
  items: PlanRunRow[]
}

/** 构建历史列表（含测试计划名称） */
export type PlanRunHistoryRow = PlanRunRow & { plan_name: string }

export type PaginatedPlanRunHistory = {
  total: number
  page: number
  page_size: number
  items: PlanRunHistoryRow[]
}

export const plansApi = {
  list: (params?: {
    keyword?: string
    status?: string
    owner?: string
    priority?: string
    page?: number
    page_size?: number
  }) => {
    const q = new URLSearchParams()
    if (params?.keyword) q.set("keyword", params.keyword)
    if (params?.status) q.set("status", params.status)
    if (params?.owner) q.set("owner", params.owner)
    if (params?.priority) q.set("priority", params.priority)
    if (params?.page) q.set("page", String(params.page))
    if (params?.page_size) q.set("page_size", String(params.page_size))
    return request<PaginatedPlans>(`/api/plans?${q}`)
  },

  create: (data: PlanCreatePayload) =>
    request<TestPlan>("/api/plans", { method: "POST", body: JSON.stringify(data) }),

  get: (planId: string) => request<TestPlan>(`/api/plans/${planId}`),

  update: (planId: string, data: PlanUpdatePayload) =>
    request<TestPlan>(`/api/plans/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (planId: string) =>
    request<void>(`/api/plans/${planId}`, { method: "DELETE" }),

  listCases: (planId: string) =>
    request<PlanCaseRow[]>(`/api/plans/${planId}/cases`),

  addCases: (planId: string, caseIds: string[]) =>
    request<PlanCaseRow[]>(`/api/plans/${planId}/cases`, {
      method: "POST",
      body: JSON.stringify({ case_ids: caseIds }),
    }),

  removeCase: (planId: string, caseId: string) =>
    request<void>(`/api/plans/${planId}/cases/${caseId}`, { method: "DELETE" }),

  /** 批量移除计划用例（一次请求） */
  bulkRemoveCases: (planId: string, caseIds: string[]) =>
    request<void>(`/api/plans/${planId}/cases`, {
      method: "DELETE",
      body: JSON.stringify({ case_ids: caseIds }),
    }),

  reorderCases: (planId: string, caseIds: string[]) =>
    request<PlanCaseRow[]>(`/api/plans/${planId}/cases/reorder`, {
      method: "PUT",
      body: JSON.stringify({ case_ids: caseIds }),
    }),

  listRuns: (planId: string, page = 1, pageSize = 20) => {
    const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
    return request<PaginatedPlanRuns>(`/api/plans/${planId}/runs?${q}`)
  },

  /** 构建历史（跨计划） */
  listPlanRunsHistory: (params?: {
    created_by?: string
    plan_keyword?: string
    date_from?: string
    date_to?: string
    page?: number
    page_size?: number
  }) => {
    const q = new URLSearchParams()
    if (params?.created_by) q.set("created_by", params.created_by)
    if (params?.plan_keyword) q.set("plan_keyword", params.plan_keyword)
    if (params?.date_from) q.set("date_from", params.date_from)
    if (params?.date_to) q.set("date_to", params.date_to)
    if (params?.page) q.set("page", String(params.page))
    if (params?.page_size) q.set("page_size", String(params.page_size))
    return request<PaginatedPlanRunHistory>(`/api/plan-runs?${q}`)
  },

  /** 仅创建 PlanRun 与 TaskRun，不自动执行 */
  createRun: (planId: string, data?: PlanRunCreatePayload) =>
    request<PlanRunRow>(`/api/plans/${planId}/runs`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),

  /** 创建并后台执行计划内全部用例 */
  startRun: (planId: string, data?: PlanRunCreatePayload) =>
    request<PlanRunRow>(`/api/plans/${planId}/runs/start`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),

  getPlanRun: (runId: string) => request<PlanRunRow>(`/api/plan-runs/${runId}`),
  getPlanRunTaskRuns: (runId: string) => request<RunOut[]>(`/api/plan-runs/${runId}/task-runs`),
}

// ── Global Variables API ─────────────────────────────────────────────────────

export type GlobalVariableType = "string" | "number" | "boolean" | "json" | "list" | "secret"

export type GlobalVariable = {
  id: string
  name: string
  var_type: GlobalVariableType
  value: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface GlobalVariableListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  items: GlobalVariable[]
}

export interface GlobalVariableQuery {
  page?: number
  page_size?: number
  keyword?: string
  var_type?: GlobalVariableType
}

function buildQueryString(params: GlobalVariableQuery): string {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.page_size) searchParams.set("page_size", String(params.page_size))
  if (params.keyword) searchParams.set("keyword", params.keyword)
  if (params.var_type) searchParams.set("var_type", params.var_type)
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ""
}

export const globalVariablesApi = {
  list: (params?: GlobalVariableQuery) =>
    request<GlobalVariableListResponse>(`/api/global-variables${buildQueryString(params ?? {})}`),

  create: (data: { name: string; var_type: GlobalVariableType; value: string; description?: string }) =>
    request<GlobalVariable>("/api/global-variables", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<{ name: string; var_type: GlobalVariableType; value: string; description: string | null }>) =>
    request<GlobalVariable>(`/api/global-variables/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/global-variables/${id}`, { method: "DELETE" }),
}

// ── Device ───────────────────────────────────────────────────────────────────

export type Device = {
  id: string
  name: string
  isPhone: boolean
}

export const devicesApi = {
  list: () => request<Device[]>("/api/devices"),
}
