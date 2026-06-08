import Link from 'next/link'
import type { ReviewSummary } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { ShareButton } from './ShareButton'
import { ReviewCardActions } from './ReviewCardActions'
import { timeAgo } from '@/lib/utils'

interface Props {
  review: ReviewSummary
}

export function ReviewCard({ review }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col gap-4 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">{review.frame_name}</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {review.published_by_name} • {timeAgo(review.published_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={review.status} />
          <ReviewCardActions reviewId={review.id} />
        </div>
      </div>

      <ProgressBar checked={review.checked_items} total={review.total_items} />

      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/reviews/${review.id}`}
          className="flex-1 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-2 border border-blue-100 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          Ver detalhes →
        </Link>
        <ShareButton reviewId={review.id} className="py-2 px-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" />
      </div>
    </div>
  )
}
