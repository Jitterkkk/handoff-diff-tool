import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getReviewDetail, deleteReview } from '@/lib/api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId } = await params
  const store = await cookies()
  const token = store.get('handoff_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const review = await getReviewDetail({ token }, reviewId)
    return NextResponse.json(review)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId } = await params
  const store = await cookies()
  const token = store.get('handoff_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteReview({ token }, reviewId)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
