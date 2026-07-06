'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Place } from '@/types'
import { ExternalLink, Star, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveResultTableProps {
  jobId: string
  initialPlaces?: Place[]
  isRunning?: boolean
}

export default function LiveResultTable({ jobId, initialPlaces = [], isRunning = false }: LiveResultTableProps) {
  const [places, setPlaces] = useState<Place[]>(initialPlaces)

  useEffect(() => {
    if (!isRunning) return

    const channel = supabase
      .channel(`job-places-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'places',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          setPlaces((prev) => [payload.new as Place, ...prev].slice(0, 200))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId, isRunning])

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-bg-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-text-muted" />
          <span className="text-text-secondary text-sm font-medium">Live Results</span>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          )}
        </div>
        <span className="text-text-muted text-xs">{places.length} places</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border">
              {['Name', 'Category', 'Rating', 'Address', 'Phone', 'Website'].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-text-muted font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {places.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-text-muted py-12 text-sm">
                  Waiting for results...
                </td>
              </tr>
            ) : (
              places.map((place, i) => (
                <tr
                  key={place.id}
                  className={cn(
                    'border-b border-bg-border/50 hover:bg-bg-elevated/50 transition-colors',
                    i === 0 && isRunning ? 'animate-fade-in bg-success/5' : ''
                  )}
                >
                  <td className="px-4 py-3 font-medium text-text-primary max-w-48 truncate">
                    {place.maps_url ? (
                      <a
                        href={place.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent flex items-center gap-1 group"
                      >
                        <span className="truncate">{place.place_name}</span>
                        <ExternalLink size={11} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      place.place_name
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary max-w-32 truncate">
                    {place.category || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {place.rating ? (
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-warning fill-warning" />
                        <span className="text-text-primary tabular-nums">{place.rating}</span>
                        {place.reviews && (
                          <span className="text-text-muted text-xs">({place.reviews.toLocaleString()})</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary max-w-56 truncate">
                    {place.address || '-'}
                  </td>
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                    {place.phone || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {place.website ? (
                      <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent-hover flex items-center gap-1 max-w-32 truncate"
                      >
                        <span className="truncate">
                          {place.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                        </span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
