'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { ReviewDetail, ReviewItem, Severity } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { DiffItemRow } from './DiffItemRow'
import { ShareButton } from './ShareButton'
import { timeAgo } from '@/lib/utils'

const SEVERITY_LABELS: Record<Severity, string> = {
  high: 'Alta prioridade',
  medium: 'Média prioridade',
  low: 'Baixa prioridade',
}
const SEVERITY_COLORS: Record<Severity, string> = {
  high: 'text-red-600',
  medium: 'text-yellow-600',
  low: 'text-gray-500',
}

interface Props {
  initialReview: ReviewDetail
  reviewId: string
}

export function ReviewDetailClient({ initialReview, reviewId }: Props) {
  const [review, setReview] = useState(initialReview)
  const [justUpdated, setJustUpdated] = useState(false)

  const fetchLatest = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    try {
      const res = await fetch(`/api/reviews/${reviewId}`)
      if (!res.ok) return
      const data: ReviewDetail = await res.json()
      const changed = data.checked_items !== review.checked_items || data.status !== review.status
      if (changed) {
        setReview(data)
        setJustUpdated(true)
        setTimeout(() => setJustUpdated(false), 2000)
      }
    } catch {}
  }, [reviewId, review.checked_items, review.status])

  useEffect(() => {
    const interval = setInterval(fetchLatest, 15000)
    function onVisible() {
      if (document.visibilityState === 'visible') fetchLatest()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchLatest])

  const bySeverity: Record<Severity, ReviewItem[]> = { high: [], medium: [], low: [] }
  for (const item of review.items ?? []) bySeverity[item.severity].push(item)

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href="/dashboard/reviews" className="hover:text-gray-600">Reviews</Link>
        <span>/</span>
        <span className="text-gray-700">{review.frame_name}</span>
        {justUpdated && (
          <span className="ml-auto text-green-500 text-xs font-medium animate-pulse">
            ✓ Atualizado agora
          </span>
        )}
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl font-bold text-gray-900">{review.frame_name}</h1>
          <div className="flex items-center gap-3 shrink-0">
            <ShareButton reviewId={reviewId} />
            <StatusBadge status={review.status} />
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Publicado por <strong>{review.published_by_name}</strong> {timeAgo(review.published_at)}
        </p>
        <ProgressBar checked={review.checked_items} total={review.total_items} size="md" />
      </div>

      {/* Done banner */}
      {review.status === 'done' && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 mb-6 flex items-center gap-3">
          <span className="text-green-500 text-xl">✓</span>
          <p className="text-sm text-green-700 font-medium">
            Revisão completa! Todos os itens foram revisados.
          </p>
        </div>
      )}

      {/* Items by severity */}
      {(['high', 'medium', 'low'] as Severity[]).map(sev => {
        const items = bySeverity[sev]
        if (items.length === 0) return null
        return (
          <div key={sev} className="mb-6">
            <h2 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${SEVERITY_COLORS[sev]}`}>
              {SEVERITY_LABELS[sev]} ({items.length})
            </h2>
            <div className="flex flex-col gap-2">
              {items.map(item => (
                <DiffItemRow key={item.id} item={item} reviewId={reviewId} />
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
