'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReviewSummary, ReviewStatus } from '@/lib/types'
import { ReviewCard } from './ReviewCard'

const FILTERS: { label: string; value: ReviewStatus | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Em andamento', value: 'in_progress' },
  { label: 'Concluídos', value: 'done' },
]

interface Props {
  initialReviews: ReviewSummary[]
  initialStatus?: string
}

export function ReviewsListClient({ initialReviews, initialStatus }: Props) {
  const [reviews, setReviews] = useState(initialReviews)
  const [newCount, setNewCount] = useState(0)
  const initialIds = useRef(new Set(initialReviews.map(r => r.id)))
  const status = initialStatus ?? 'all'

  const fetchLatest = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    try {
      const qs = status !== 'all' ? `?status=${status}` : ''
      const res = await fetch(`/api/reviews${qs}`)
      if (!res.ok) return
      const data: ReviewSummary[] = await res.json()
      setReviews(data)
      const fresh = data.filter(r => !initialIds.current.has(r.id)).length
      setNewCount(fresh)
    } catch {}
  }, [status])

  useEffect(() => {
    const interval = setInterval(fetchLatest, 30000)
    function onVisible() {
      if (document.visibilityState === 'visible') fetchLatest()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchLatest])

  const filtered = status !== 'all' ? reviews.filter(r => r.status === status) : reviews

  return (
    <>
      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {FILTERS.map(f => (
          <a
            key={f.value}
            href={f.value === 'all' ? '/dashboard/reviews' : `?status=${f.value}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              status === f.value
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.label}
          </a>
        ))}
        {newCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {newCount} {newCount === 1 ? 'novo' : 'novos'}
          </span>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">◻</p>
          <p className="text-sm font-medium">Nenhum review encontrado</p>
          <p className="text-xs mt-1">Tente outro filtro ou publique um review pelo plugin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </>
  )
}
