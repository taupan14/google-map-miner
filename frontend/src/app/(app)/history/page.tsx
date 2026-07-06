'use client'

import { useState, useEffect } from 'react'
import { listJobs, deleteJob, getExportUrl } from '@/lib/api'
import { Job } from '@/types'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatRelative, buildLocationString, getProgress } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { Download, Trash2, ExternalLink, Search, ChevronLeft, ChevronRight, History } from 'lucide-react'

const PAGE_SIZE = 15

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  async function fetchJobs() {
    setLoading(true)
    try {
      const data = await listJobs({ status: statusFilter || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      setJobs(data.jobs)
      setTotal(data.total)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchJobs() }, [page, statusFilter])

  async function handleDelete(id: string) {
    if (!confirm('Delete this job and all its data?')) return
    try {
      await deleteJob(id)
      toast.success('Job deleted')
      fetchJobs()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filtered = filter
    ? jobs.filter((j) =>
        j.keyword.toLowerCase().includes(filter.toLowerCase()) ||
        buildLocationString(j).toLowerCase().includes(filter.toLowerCase())
      )
    : jobs

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6">
      <div className="max-w-6xl space-y-5">
        <div className="flex items-center gap-2">
          <History size={20} className="text-text-muted" />
          <h1 className="text-text-primary text-2xl font-semibold">History</h1>
          <span className="text-text-muted text-sm">({total} jobs)</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Filter by keyword or location..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
            className="input-field w-40"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border">
                {['Keyword', 'Location', 'Status', 'Results', 'Progress', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-text-muted font-medium text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-bg-border/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 bg-bg-elevated rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-text-muted">No jobs found</td></tr>
              ) : (
                filtered.map((job) => {
                  const pct = getProgress(job.total_found, job.total_scraped)
                  return (
                    <tr key={job.id} className="border-b border-bg-border/50 hover:bg-bg-elevated/40 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-text-primary">{job.keyword}</td>
                      <td className="px-5 py-3.5 text-text-secondary text-xs max-w-36 truncate">{buildLocationString(job) || '-'}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={job.status} size="sm" /></td>
                      <td className="px-5 py-3.5 text-text-secondary tabular-nums text-xs">
                        {job.total_scraped.toLocaleString()} / {job.total_found.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-text-muted text-xs tabular-nums">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-text-muted text-xs whitespace-nowrap">{formatRelative(job.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Link href={`/jobs/${job.id}`} className="p-1.5 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors" title="View detail">
                            <ExternalLink size={13} />
                          </Link>
                          {job.status === 'completed' && (
                            <button onClick={() => window.open(getExportUrl(job.id), '_blank')} className="p-1.5 rounded hover:bg-bg-elevated text-text-muted hover:text-success transition-colors" title="Export XLSX">
                              <Download size={13} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(job.id)} className="p-1.5 rounded hover:bg-bg-elevated text-text-muted hover:text-danger transition-colors" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary py-1.5 px-3 disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary py-1.5 px-3 disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
