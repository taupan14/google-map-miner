import { JobStatus } from '@/types'
import { cn, getStatusBg } from '@/lib/utils'

interface StatusBadgeProps {
  status: JobStatus
  showDot?: boolean
  size?: 'sm' | 'md'
}

const labels: Record<JobStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export default function StatusBadge({ status, showDot = true, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        getStatusBg(status),
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      {showDot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            status === 'running' ? 'animate-pulse bg-current' : 'bg-current'
          )}
        />
      )}
      {labels[status]}
    </span>
  )
}
