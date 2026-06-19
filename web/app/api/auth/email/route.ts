import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://handoff-api.onrender.com'

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    type: 'login' | 'register'
    email: string
    password: string
    name?: string
  }
  const { type, email, password, name } = body

  const path = type === 'register' ? '/auth/register' : '/auth/login'
  const payload = type === 'register'
    ? { email, password, name }
    : { email, password }

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  const data = await res.json().catch(() => ({ error: 'Unknown error' })) as { token?: string; error?: string }

  if (!res.ok || !data.token) {
    return NextResponse.json({ error: data.error ?? 'Authentication failed' }, { status: res.status })
  }

  const response = NextResponse.json({ ok: true }, { status: type === 'register' ? 201 : 200 })
  response.cookies.set('handoff_token', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
