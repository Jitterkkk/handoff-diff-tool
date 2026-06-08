import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { archiveReview } from '@/lib/api'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId } = await params
  const store = await cookies()
  const token = store.get('handoff_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await archiveReview({ token }, reviewId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
