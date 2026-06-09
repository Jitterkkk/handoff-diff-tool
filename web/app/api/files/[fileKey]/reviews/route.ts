import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getFileReviews } from '@/lib/api'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileKey: string }> },
) {
  const { fileKey } = await params
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? undefined
  const limitRaw = searchParams.get('limit')
  const offsetRaw = searchParams.get('offset')
  const limit = limitRaw ? Number(limitRaw) : undefined
  const offset = offsetRaw ? Number(offsetRaw) : undefined

  const store = await cookies()
  const token = store.get('handoff_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const page = await getFileReviews({ token, fileKey, status, limit, offset })
    return NextResponse.json(page)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
