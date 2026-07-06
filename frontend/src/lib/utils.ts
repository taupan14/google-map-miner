import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { JobStatus } from '@/types'
import { formatDistanceToNow, format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'dd MMM yyyy, HH:mm')
}

export function formatRelative(date: string | undefined): string {
  if (!date) return '-'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  return `${hrs}h ${remMins}m`
}

export function formatBytes(mb: number | undefined): string {
  if (mb === undefined || mb === null) return '-'
  if (mb < 1) return `${Math.round(mb * 1024)} KB`
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

export function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return '0'
  return n.toLocaleString('id-ID')
}

export function getProgress(total_found: number, total_scraped: number): number {
  if (!total_found || total_found === 0) return 0
  return Math.min(Math.round((total_scraped / total_found) * 100), 100)
}

export function getStatusColor(status: JobStatus): string {
  switch (status) {
    case 'pending': return 'text-text-muted'
    case 'running': return 'text-info'
    case 'completed': return 'text-success'
    case 'failed': return 'text-danger'
    case 'cancelled': return 'text-warning'
    default: return 'text-text-secondary'
  }
}

export function getStatusBg(status: JobStatus): string {
  switch (status) {
    case 'pending': return 'bg-text-muted/10 text-text-muted border-text-muted/20'
    case 'running': return 'bg-info/10 text-info border-info/20'
    case 'completed': return 'bg-success/10 text-success border-success/20'
    case 'failed': return 'bg-danger/10 text-danger border-danger/20'
    case 'cancelled': return 'bg-warning/10 text-warning border-warning/20'
    default: return 'bg-bg-elevated text-text-secondary'
  }
}

export function getLogColor(level: string): string {
  switch (level) {
    case 'success': return 'text-success'
    case 'warning': return 'text-warning'
    case 'error': return 'text-danger'
    default: return 'text-text-secondary'
  }
}

export function getLogPrefix(level: string): string {
  switch (level) {
    case 'success': return '✓'
    case 'warning': return '⚠'
    case 'error': return '✗'
    default: return '›'
  }
}

export function buildLocationString(job: { province?: string; city?: string; district?: string; country?: string }): string {
  return [job.district, job.city, job.province, job.country]
    .filter(Boolean)
    .join(', ')
}
