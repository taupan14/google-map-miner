'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { JobLog } from '@/types'
import { cn, getLogColor, getLogPrefix } from '@/lib/utils'
import { format } from 'date-fns'
import { Terminal, ArrowDown } from 'lucide-react'

interface LiveConsoleProps {
  jobId: string
  initialLogs?: JobLog[]
  isRunning?: boolean
}

export default function LiveConsole({ jobId, initialLogs = [], isRunning = false }: LiveConsoleProps) {
  const [logs, setLogs] = useState<JobLog[]>(initialLogs)
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Subscribe to new logs via Supabase Realtime
  useEffect(() => {
    if (!isRunning) return

    const channel = supabase
      .channel(`job-logs-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_logs',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          setLogs((prev) => [...prev, payload.new as JobLog])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId, isRunning])

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40
    setAutoScroll(isAtBottom)
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-text-muted" />
          <span className="text-text-secondary text-sm font-medium">Live Console</span>
          <span className="text-text-muted text-xs">({logs.length} entries)</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-danger/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
          </div>
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-72 overflow-y-auto bg-[#0A0F1E] p-4 font-mono text-sm space-y-0.5 relative"
      >
        {/* Prompt header */}
        <div className="text-text-muted mb-2">
          <span className="text-accent">map-miner</span>
          <span className="text-text-muted">@worker</span>
          <span className="text-text-muted">:~$ </span>
          <span className="text-text-secondary">tail -f job.log --job-id {jobId.slice(0, 8)}</span>
        </div>

        {logs.length === 0 ? (
          <div className="text-text-muted italic">Waiting for job to start...</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={cn('flex gap-2 leading-relaxed animate-fade-in', getLogColor(log.level))}
            >
              <span className="text-text-muted shrink-0 tabular-nums">
                [{format(new Date(log.created_at), 'HH:mm:ss')}]
              </span>
              <span className="shrink-0">{getLogPrefix(log.level)}</span>
              <span className={cn(log.level === 'info' ? 'text-text-secondary' : '')}>{log.message}</span>
            </div>
          ))
        )}

        {/* Blinking cursor when running */}
        {isRunning && (
          <div className="flex gap-2 text-text-muted">
            <span>▊</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true)
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="absolute bottom-14 right-6 bg-accent text-white p-1.5 rounded-full shadow-lg hover:bg-accent-hover transition-colors"
        >
          <ArrowDown size={14} />
        </button>
      )}
    </div>
  )
}
