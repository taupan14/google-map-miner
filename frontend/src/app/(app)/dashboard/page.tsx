import { getDashboardStats, listJobs } from '@/lib/api'
import { formatNumber, formatRelative, buildLocationString } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { Map, Briefcase, CheckCircle, Activity, ArrowRight, Plus } from 'lucide-react'

export const revalidate = 30

async function DashboardPage() {
  const [stats, jobsData] = await Promise.all([
    getDashboardStats().catch(() => ({ total_jobs: 0, total_places: 0, running_jobs: 0, success_rate: 0 })),
    listJobs({ limit: 5 }).catch(() => ({ jobs: [], total: 0 })),
  ])

  const statCards = [
    { label: 'Total Jobs', value: formatNumber(stats.total_jobs), icon: Briefcase, color: 'text-accent' },
    { label: 'Total Places', value: formatNumber(stats.total_places), icon: Map, color: 'text-info' },
    { label: 'Running', value: formatNumber(stats.running_jobs), icon: Activity, color: 'text-warning' },
    { label: 'Success Rate', value: `${stats.success_rate}%`, icon: CheckCircle, color: 'text-success' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary text-2xl font-semibold">Dashboard</h1>
          <p className="text-text-muted text-sm mt-0.5">Monitor your mining operations</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          <Plus size={16} />
          New Job
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-xs font-medium uppercase tracking-wide">{label}</span>
              <Icon size={16} className={color} />
            </div>
            <div className="text-text-primary text-3xl font-bold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between">
          <h2 className="text-text-primary font-medium">Recent Jobs</h2>
          <Link href="/history" className="text-accent text-sm hover:text-accent-hover flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {jobsData.jobs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Map size={32} className="text-text-muted mx-auto" />
            <p className="text-text-muted text-sm">No jobs yet.</p>
            <Link href="/jobs/new" className="btn-primary w-fit mx-auto">
              <Plus size={14} />
              Create your first job
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border">
                {['Keyword', 'Location', 'Status', 'Progress', 'Created', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-text-muted font-medium text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobsData.jobs.map((job) => {
                const pct = job.total_found > 0
                  ? Math.round((job.total_scraped / job.total_found) * 100)
                  : 0
                return (
                  <tr key={job.id} className="border-b border-bg-border/50 hover:bg-bg-elevated/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-text-primary font-medium">{job.keyword}</span>
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary max-w-40 truncate">
                      {buildLocationString(job) || '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-text-muted text-xs tabular-nums">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-text-muted text-xs">
                      {formatRelative(job.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-accent hover:text-accent-hover text-xs flex items-center gap-1"
                      >
                        View <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
