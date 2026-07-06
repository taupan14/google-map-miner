import { JobMetrics } from '@/types'
import { formatDuration, formatBytes, formatNumber } from '@/lib/utils'
import { Clock, Database, Cpu, MemoryStick, Wifi, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  accent?: string
}

function MetricCard({ label, value, sub, icon, accent = 'text-accent' }: MetricCardProps) {
  return (
    <div className="glass-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-xs font-medium uppercase tracking-wide">{label}</span>
        <span className={cn('opacity-60', accent)}>{icon}</span>
      </div>
      <div className="text-text-primary font-semibold text-xl tabular-nums">{value}</div>
      {sub && <div className="text-text-muted text-xs">{sub}</div>}
    </div>
  )
}

interface CpuBarProps {
  label: string
  value?: number
}

function CpuBar({ label, value }: CpuBarProps) {
  if (value === undefined) return null
  const pct = Math.min(value, 100)
  const color = pct > 80 ? 'bg-danger' : pct > 60 ? 'bg-warning' : 'bg-success'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-primary tabular-nums font-medium">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

interface JobAnalyticsProps {
  metrics: JobMetrics | null
}

export default function JobAnalytics({ metrics }: JobAnalyticsProps) {
  if (!metrics) {
    return (
      <div className="glass-card p-6 text-center text-text-muted text-sm">
        Analytics will appear when the job completes.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-text-muted" />
        <h3 className="text-text-secondary text-sm font-medium uppercase tracking-wide">Job Analytics</h3>
      </div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Duration"
          value={formatDuration(metrics.duration_seconds)}
          icon={<Clock size={16} />}
          accent="text-info"
        />
        <MetricCard
          label="Places Found"
          value={formatNumber(metrics.total_places_found)}
          icon={<Database size={16} />}
          accent="text-accent"
        />
        <MetricCard
          label="Places Saved"
          value={formatNumber(metrics.total_places_saved)}
          sub={metrics.total_places_found
            ? `${Math.round((metrics.total_places_saved! / metrics.total_places_found!) * 100)}% success rate`
            : undefined}
          icon={<Database size={16} />}
          accent="text-success"
        />
        <MetricCard
          label="Bandwidth"
          value={formatBytes(metrics.bandwidth_mb)}
          icon={<Wifi size={16} />}
          accent="text-warning"
        />
      </div>

      {/* CPU & RAM bars */}
      <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* CPU */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-text-muted" />
            <span className="text-text-secondary text-xs font-medium uppercase tracking-wide">CPU Usage</span>
          </div>
          <CpuBar label="Average" value={metrics.cpu_avg} />
          <CpuBar label="Peak" value={metrics.cpu_peak} />
        </div>

        {/* RAM */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MemoryStick size={14} className="text-text-muted" />
            <span className="text-text-secondary text-xs font-medium uppercase tracking-wide">Memory Usage</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Average</span>
              <span className="text-text-primary tabular-nums font-medium">{formatBytes(metrics.memory_avg_mb)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Peak</span>
              <span className="text-text-primary tabular-nums font-medium">{formatBytes(metrics.memory_peak_mb)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
