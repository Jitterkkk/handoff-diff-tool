import Link from 'next/link'
import type { ReviewSummary } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { ShareButton } from './ShareButton'
import { timeAgo } from '@/lib/utils'

interface Props {
  review: ReviewSummary
}

export function ReviewCard({ review }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4 hover:border-blue-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate text-sm">{review.frame_name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {review.published_by_name} • {timeAgo(review.published_at)}
          </p>
        </div>
        <StatusBadge status={review.status} />
      </div>

      <ProgressBar checked={review.checked_items} total={review.total_items} />

      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/reviews/${review.id}`}
          className="flex-1 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 py-2 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Ver detalhes →
        </Link>
        <ShareButton reviewId={review.id} className="py-2 px-3 border border-gray-100 rounded-lg hover:bg-gray-50" />
      </div>
    </div>
  )
}
