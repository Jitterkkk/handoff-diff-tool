'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PublicReview, PublicReviewItem, ReviewStatus, Severity } from '@/lib/types'
import { StatusBadge } from '@/components/StatusBadge'
import { cn, timeAgo } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://handoff-api.onrender.com'

const SEVERITY_ICONS: Record<Severity, string> = { high: '🔴', medium: '🟡', low: '🟢' }
const SEVERITY_LABELS: Record<Severity, string> = {
  high: 'Alta prioridade',
  medium: 'Média prioridade',
  low: 'Baixa prioridade',
}
const DIFF_ICONS: Record<string, string> = {
  COLOR: '🎨', SIZE: '⇔', TYPOGRAPHY: 'T', CONTENT: '✏',
  ADDED: '+', REMOVED: '−', COMPONENT: '◈', LAYOUT: '⊞', POSITION: '↖',
}

function deriveStatus(items: PublicReviewItem[]): ReviewStatus {
  if (items.length === 0) return 'pending'
  const checked = items.filter(i => i.checked_at !== null).length
  if (checked === 0) return 'pending'
  if (checked === items.length) return 'done'
  return 'in_progress'
}

interface Props {
  initialReview: PublicReview
  reviewId: string
}

export function PublicReviewClient({ initialReview, reviewId }: Props) {
  const [review, setReview] = useState(initialReview)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const fetchLatest = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    try {
      const res = await fetch(`${API_BASE}/api/reviews/${reviewId}/public`)
      if (!res.ok) return
      const data: PublicReview = await res.json()
      setReview(data)
    } catch {}
  }, [reviewId])

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

  async function handleToggle(item: PublicReviewItem) {
    const newChecked = item.checked_at === null
    setPendingIds(s => new Set(s).add(item.id))

    const optimisticItems = review.items.map(i =>
      i.id === item.id ? { ...i, checked_at: newChecked ? new Date().toISOString() : null } : i
    )
    setReview(r => ({ ...r, items: optimisticItems, status: deriveStatus(optimisticItems) }))

    try {
      const res = await fetch(`${API_BASE}/api/reviews/${reviewId}/items/${item.id}/public`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: newChecked }),
      })
      if (res.ok) {
        const updated: PublicReviewItem = await res.json()
        setReview(r => {
          const items = r.items.map(i => i.id === updated.id ? updated : i)
          return { ...r, items, status: deriveStatus(items) }
        })
      }
    } catch {
      setReview(r => {
        const items = r.items.map(i => i.id === item.id ? item : i)
        return { ...r, items, status: deriveStatus(items) }
      })
    } finally {
      setPendingIds(s => { const n = new Set(s); n.delete(item.id); return n })
    }
  }

  const checkedCount = review.items.filter(i => i.checked_at !== null).length
  const total = review.items.length
  const bySeverity: Record<Severity, PublicReviewItem[]> = { high: [], medium: [], low: [] }
  for (const item of review.items) bySeverity[item.severity].push(item)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-gray-900 tracking-tight">Handoff</span>
          <StatusBadge status={review.status} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{review.frame_name}</h1>
          <p className="text-sm text-gray-400">
            Publicado por{' '}
            <strong className="text-gray-600">{review.published_by_name}</strong>
            {' · '}
            {timeAgo(review.published_at)}
          </p>
          {review.description && (
            <p className="text-sm text-gray-600 mt-3 bg-white border border-gray-100 rounded-lg px-4 py-3">
              {review.description}
            </p>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 mb-6 flex items-center gap-4">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: total > 0 ? `${(checkedCount / total) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-sm text-gray-500 whitespace-nowrap tabular-nums">
            {checkedCount}/{total} revisados
          </span>
        </div>

        {review.status === 'done' && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <span className="text-green-500">✓</span>
            <p className="text-sm text-green-700 font-medium">
              Revisão completa! Todos os itens foram revisados.
            </p>
          </div>
        )}

        {(['high', 'medium', 'low'] as Severity[]).map(sev => {
          const items = bySeverity[sev]
          if (items.length === 0) return null
          return (
            <div key={sev} className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                {SEVERITY_ICONS[sev]} {SEVERITY_LABELS[sev]} ({items.length})
              </h2>
              <div className="flex flex-col gap-2">
                {items.map(item => {
                  const isChecked = item.checked_at !== null
                  const isPending = pendingIds.has(item.id)
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 rounded-lg border transition-all',
                        isChecked ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100',
                        isPending && 'opacity-60',
                      )}
                    >
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={isPending}
                        className={cn(
                          'w-5 h-5 mt-0.5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors',
                          isChecked
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-green-400',
                        )}
                      >
                        {isChecked && <span className="text-[10px] leading-none">✓</span>}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-gray-400">
                            {DIFF_ICONS[item.diff_type] ?? '•'}
                          </span>
                          <span className={cn(
                            'text-sm font-medium text-gray-800',
                            isChecked && 'line-through text-gray-400',
                          )}>
                            {item.node_name}
                          </span>
                          <span className="text-xs text-gray-400 uppercase tracking-wide">
                            {item.diff_type.toLowerCase()}
                          </span>
                          {isChecked && (
                            <span className="text-xs text-green-600 font-medium">Revisado</span>
                          )}
                        </div>

                        {(item.before_value !== null || item.after_value !== null) && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs font-mono">
                            {item.before_value !== null && (
                              <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                                {String(item.before_value).slice(0, 40)}
                              </span>
                            )}
                            {item.before_value !== null && item.after_value !== null && (
                              <span className="text-gray-300">→</span>
                            )}
                            {item.after_value !== null && (
                              <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                                {String(item.after_value).slice(0, 40)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {review.items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">◻</p>
            <p className="text-sm font-medium">Nenhuma alteração detectada neste review.</p>
          </div>
        )}
      </main>
    </div>
  )
}
