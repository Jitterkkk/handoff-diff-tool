import { cookies } from 'next/headers'
import { getReviews } from '@/lib/api'
import { ReviewsListClient } from '@/components/ReviewsListClient'
import type { ReviewSummary } from '@/lib/types'
import type { Metadata } from 'next'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies()
  const token = store.get('handoff_token')?.value

  let pendingCount = 0
  if (token) {
    try {
      const reviews = await getReviews({ token })
      pendingCount = reviews.filter(r => r.status === 'pending').length
    } catch {}
  }

  const title = pendingCount > 0 ? `(${pendingCount}) Reviews — Handoff` : 'Reviews — Handoff'
  return { title }
}

export default async function ReviewsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const store = await cookies()
  const token = store.get('handoff_token')?.value

  let reviews: ReviewSummary[] = []
  if (token) {
    try {
      reviews = await getReviews({ token })
    } catch {}
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-400 mt-1">
          {reviews.length} review{reviews.length !== 1 ? 's' : ''} no total
        </p>
      </div>

      <ReviewsListClient initialReviews={reviews} initialStatus={status} />
    </div>
  )
}
