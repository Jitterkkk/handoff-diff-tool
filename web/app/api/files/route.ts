import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getFiles } from '@/lib/api'

export async function GET() {
  const store = await cookies()
  const token = store.get('handoff_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const files = await getFiles({ token })
    return NextResponse.json(files)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
