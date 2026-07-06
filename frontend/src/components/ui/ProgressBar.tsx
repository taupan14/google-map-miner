import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number       // 0-100
  total?: number
  scraped?: number
  showLabel?: boolean
  className?: string
}

export default function ProgressBar({ value, total, scraped, showLabel = true, className }: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 100)

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary font-medium">Progress</span>
          <div className="flex items-center gap-3">
            {total !== undefined && scraped !== undefined && (
              <span className="text-text-muted font-mono text-xs">
                {scraped.toLocaleString()} / {total.toLocaleString()}
              </span>
            )}
            <span className="text-text-primary font-semibold tabular-nums">{pct}%</span>
          </div>
        </div>
      )}

      <div className="relative h-2 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        >
          {/* Shimmer effect when running */}
          {pct > 0 && pct < 100 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
          )}
        </div>
      </div>

      {/* Block progress visualization */}
      {showLabel && (
        <div className="flex gap-0.5">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-sm transition-colors duration-300',
                i < Math.floor(pct / 5) ? 'bg-accent' : 'bg-bg-elevated'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
