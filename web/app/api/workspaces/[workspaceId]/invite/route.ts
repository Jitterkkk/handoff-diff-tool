import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://handoff-api.onrender.com'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const store = await cookies()
  const token = store.get('handoff_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await params
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
