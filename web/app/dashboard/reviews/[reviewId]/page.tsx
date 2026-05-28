import { cookies } from 'next/headers'
import Link from 'next/link'
import { getReviewDetail } from '@/lib/api'
import { StatusBadge } from '@/components/StatusBadge'
import { ProgressBar } from '@/components/ProgressBar'
import { DiffItemRow } from '@/components/DiffItemRow'
import { timeAgo } from '@/lib/utils'
import type { ReviewItem, Severity } from '@/lib/types'
import { notFound } from 'next/navigation'

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
  params: Promise<{ reviewId: string }>
}

export default async function ReviewDetailPage({ params }: Props) {
  const { reviewId } = await params
  const store = await cookies()
  const token = store.get('handoff_token')?.value

  if (!token) notFound()

  let review
  try {
    review = await getReviewDetail({ token }, reviewId)
  } catch {
    notFound()
  }

  const bySeverity: Record<Severity, ReviewItem[]> = { high: [], medium: [], low: [] }
  for (const item of review.items ?? []) {
    bySeverity[item.severity].push(item)
  }

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href="/dashboard/reviews" className="hover:text-gray-600">Reviews</Link>
        <span>/</span>
        <span className="text-gray-700">{review.frame_name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl font-bold text-gray-900">{review.frame_name}</h1>
          <StatusBadge status={review.status} />
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
          <p className="text-sm text-green-700 font-medium">Revisão completa! Todos os itens foram revisados.</p>
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
    </div>
  )
}
