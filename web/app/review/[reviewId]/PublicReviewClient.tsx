'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PublicReview, PublicReviewItem, ReviewStatus, Severity } from '@/lib/types'
import { StatusBadge } from '@/components/StatusBadge'
import { ThemeToggle } from '@/components/ThemeToggle'
import { diffLabel, ValueBadge } from '@/lib/diffFormatters'
import { cn, timeAgo } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://handoff-api.onrender.com'

const SEVERITY_ICONS: Record<Severity, string> = { high: '🔴', medium: '🟡', low: '🟢' }
const SEVERITY_LABELS: Record<Severity, string> = {
  high: 'Alta prioridade',
  medium: 'Média prioridade',
  low: 'Baixa prioridade',
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
  const pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0
  const bySeverity: Record<Severity, PublicReviewItem[]> = { high: [], medium: [], low: [] }
  for (const item of review.items) bySeverity[item.severity].push(item)

  const hasFigmaLink = review.file_key && !review.file_key.startsWith('local-')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header sticky */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <span className="font-bold text-gray-900 dark:text-gray-100 tracking-tight">Handoff</span>
          <div className="flex items-center gap-3">
            <StatusBadge status={review.status} />
            <ThemeToggle className="text-base text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Cabeçalho do review */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{review.frame_name}</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Publicado por{' '}
            <strong className="text-gray-600 dark:text-gray-300">{review.published_by_name}</strong>
            {' · '}
            {timeAgo(review.published_at)}
          </p>
          {review.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-4 py-3">
              {review.description}
            </p>
          )}
        </div>

        {/* Barra de progresso */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Progresso da revisão</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
              {pct}% · {checkedCount}/{total}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Banner de conclusão */}
        {review.status === 'done' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <span className="text-green-500">✓</span>
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              Revisão completa! Todos os itens foram revisados.
            </p>
          </div>
        )}

        {/* Items agrupados por severidade */}
        {(['high', 'medium', 'low'] as Severity[]).map(sev => {
          const items = bySeverity[sev]
          if (items.length === 0) return null
          return (
            <div key={sev} className="mb-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
                {SEVERITY_ICONS[sev]} {SEVERITY_LABELS[sev]} ({items.length})
              </h2>
              <div className="flex flex-col gap-2">
                {items.map(item => {
                  const isChecked = item.checked_at !== null
                  const isPending = pendingIds.has(item.id)
                  const cleanName = item.node_name.replace(/^[\s–\-]+/, '')
                  const figmaUrl = hasFigmaLink
                    ? `https://www.figma.com/design/${review.file_key}?node-id=${encodeURIComponent(item.node_id)}`
                    : null

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'group flex items-start gap-3 px-4 py-3 rounded-lg border transition-all',
                        isChecked
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30'
                          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750',
                        isPending && 'opacity-60',
                      )}
                    >
                      {/* Checkbox com área de toque maior */}
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={isPending}
                        className="-m-1 p-1 shrink-0 mt-0.5"
                        aria-label={isChecked ? 'Desmarcar item' : 'Marcar como revisado'}
                      >
                        <span className={cn(
                          'w-5 h-5 rounded flex items-center justify-center border-2 transition-colors',
                          isChecked
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500',
                        )}>
                          {isChecked && <span className="text-[10px] leading-none">✓</span>}
                        </span>
                      </button>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            'text-sm font-semibold text-gray-900 dark:text-gray-100',
                            isChecked && 'line-through text-gray-400 dark:text-gray-600',
                          )}>
                            {cleanName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {diffLabel(item.diff_type)}
                          </span>
                          {isChecked && (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">· Revisado</span>
                          )}
                          {/* Link Figma — visível só no hover */}
                          {figmaUrl && (
                            <a
                              href={figmaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto text-xs text-gray-400 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100"
                            >
                              ↗ Ver no Figma
                            </a>
                          )}
                        </div>

                        {/* Valores before → after */}
                        {(item.before_value !== null || item.after_value !== null) && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <ValueBadge value={item.before_value} variant="before" />
                            <span className="text-gray-300 dark:text-gray-600 text-xs">→</span>
                            <ValueBadge value={item.after_value} variant="after" />
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
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <p className="text-4xl mb-3">◻</p>
            <p className="text-sm font-medium">Nenhuma alteração detectada neste review.</p>
          </div>
        )}
      </main>
    </div>
  )
}
