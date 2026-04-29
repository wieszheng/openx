const BASE_URL = "http://localhost:8000"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`)
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

export type TestCase = {
  id: string
  name: string
  directory_id: string | null
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
  owner?: string
  priority?: string
  page?: number
  page_size?: number
}

export const casesApi = {
  get: (id: string) =>
    request<TestCase>(`/api/cases/${id}`),

  list: (directoryId: string, params?: CaseListParams) => {
    const q = new URLSearchParams()
    if (params?.keyword) q.set("keyword", params.keyword)
    if (params?.owner) q.set("owner", params.owner)
    if (params?.priority) q.set("priority", params.priority)
    if (params?.page) q.set("page", String(params.page))
    if (params?.page_size) q.set("page_size", String(params.page_size))
    return request<PaginatedTestCases>(`/api/directories/${directoryId}/cases?${q}`)
  },

  create: (
    directoryId: string,
    data: Pick<TestCase, "name" | "priority" | "status"> &
      Partial<Pick<TestCase, "description" | "tags" | "preconditions" | "steps_manual" | "expected_result" | "created_by">>,
  ) =>
    request<TestCase>(`/api/directories/${directoryId}/cases`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<Pick<TestCase, "name" | "description" | "priority" | "tags" | "status" | "preconditions" | "steps_manual" | "expected_result" | "is_automated">>,
  ) =>
    request<TestCase>(`/api/cases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/cases/${id}`, { method: "DELETE" }),
}
