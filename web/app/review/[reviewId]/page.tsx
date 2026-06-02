import { getPublicReview } from '@/lib/api'
import { PublicReviewClient } from './PublicReviewClient'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ reviewId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reviewId } = await params
  try {
    const review = await getPublicReview(reviewId)
    return { title: `${review.frame_name} — Handoff Review` }
  } catch {
    return { title: 'Review — Handoff' }
  }
}

export default async function PublicReviewPage({ params }: Props) {
  const { reviewId } = await params

  let review
  try {
    review = await getPublicReview(reviewId)
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">◻</p>
          <h1 className="text-lg font-semibold text-gray-900">Review não encontrado</h1>
          <p className="text-sm text-gray-400 mt-1">
            O link pode ter expirado ou o review foi removido.
          </p>
        </div>
      </div>
    )
  }

  return <PublicReviewClient initialReview={review} reviewId={reviewId} />
}
