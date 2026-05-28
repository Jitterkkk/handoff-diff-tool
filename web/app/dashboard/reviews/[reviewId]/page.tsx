import { cookies } from 'next/headers'
import { getReviewDetail } from '@/lib/api'
import { ReviewDetailClient } from '@/components/ReviewDetailClient'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ reviewId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reviewId } = await params
  const store = await cookies()
  const token = store.get('handoff_token')?.value
  if (!token) return { title: 'Review — Handoff' }

  try {
    const review = await getReviewDetail({ token }, reviewId)
    return { title: `${review.frame_name} — Handoff` }
  } catch {
    return { title: 'Review — Handoff' }
  }
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

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <ReviewDetailClient initialReview={review} reviewId={reviewId} />
    </div>
  )
}
