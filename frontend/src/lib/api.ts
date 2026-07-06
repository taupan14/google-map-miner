import { Job, JobLog, Place, JobMetrics, DashboardStats, CreateJobPayload } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// ── Jobs ──────────────────────────────────────────────────────

export async function createJob(payload: CreateJobPayload): Promise<Job> {
  return apiFetch('/api/v1/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listJobs(params?: { status?: string; limit?: number; offset?: number }): Promise<{ jobs: Job[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))
  return apiFetch(`/api/v1/jobs?${qs.toString()}`)
}

export async function getJob(jobId: string): Promise<Job> {
  return apiFetch(`/api/v1/jobs/${jobId}`)
}

export async function cancelJob(jobId: string): Promise<Job> {
  return apiFetch(`/api/v1/jobs/${jobId}/cancel`, { method: 'POST' })
}

export async function deleteJob(jobId: string): Promise<void> {
  return apiFetch(`/api/v1/jobs/${jobId}`, { method: 'DELETE' })
}

// ── Logs ──────────────────────────────────────────────────────

export async function getJobLogs(jobId: string): Promise<{ logs: JobLog[] }> {
  return apiFetch(`/api/v1/jobs/${jobId}/logs`)
}

// ── Places ────────────────────────────────────────────────────

export async function getJobPlaces(jobId: string, params?: { limit?: number; offset?: number }): Promise<{ places: Place[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))
  return apiFetch(`/api/v1/jobs/${jobId}/places?${qs.toString()}`)
}

// ── Metrics ───────────────────────────────────────────────────

export async function getJobMetrics(jobId: string): Promise<JobMetrics> {
  return apiFetch(`/api/v1/jobs/${jobId}/metrics`)
}

// ── Stats ─────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch('/api/v1/stats')
}

// ── Export ────────────────────────────────────────────────────

export function getExportUrl(jobId: string): string {
  return `${BASE_URL}/api/v1/jobs/${jobId}/export`
}
