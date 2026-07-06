export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type LogLevel = 'info' | 'success' | 'warning' | 'error'

export interface Job {
  id: string
  keyword: string
  country: string
  province?: string
  city?: string
  district?: string
  status: JobStatus
  total_found: number
  total_scraped: number
  error_message?: string
  started_at?: string
  finished_at?: string
  created_at: string
}

export interface JobLog {
  id: number
  job_id: string
  level: LogLevel
  message: string
  created_at: string
}

export interface Place {
  id: number
  job_id: string
  place_name: string
  category?: string
  address?: string
  phone?: string
  website?: string
  rating?: number
  reviews?: number
  latitude?: number
  longitude?: number
  maps_url?: string
  created_at: string
}

export interface JobMetrics {
  id?: number
  job_id: string
  started_at?: string
  finished_at?: string
  duration_seconds?: number
  total_places_found?: number
  total_places_saved?: number
  cpu_avg?: number
  cpu_peak?: number
  memory_avg_mb?: number
  memory_peak_mb?: number
  bandwidth_mb?: number
}

export interface DashboardStats {
  total_jobs: number
  total_places: number
  running_jobs: number
  success_rate: number
}

export interface CreateJobPayload {
  keyword: string
  country: string
  province?: string
  city?: string
  district?: string
}
