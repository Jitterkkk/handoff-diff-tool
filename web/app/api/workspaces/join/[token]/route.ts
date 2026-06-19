import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://handoff-api.onrender.com'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const store = await cookies()
  const cookieToken = store.get('handoff_token')?.value

  const { token } = await params
  const headers: Record<string, string> = {}
  if (cookieToken) headers['Authorization'] = `Bearer ${cookieToken}`

  try {
    const res = await fetch(`${API_BASE}/api/workspaces/join/${token}`, {
      method: 'POST',
      headers,
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
