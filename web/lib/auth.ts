import 'server-only'
import { cookies } from 'next/headers'

const TOKEN_COOKIE = 'handoff_token'
const MAX_AGE = 30 * 24 * 60 * 60

export async function getToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(TOKEN_COOKIE)?.value ?? null
}

export async function saveToken(token: string): Promise<void> {
  const store = await cookies()
  store.set(TOKEN_COOKIE, token, {
    maxAge: MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export async function clearToken(): Promise<void> {
  const store = await cookies()
  store.delete(TOKEN_COOKIE)
}

export interface TokenPayload {
  figmaUserId: string
  name: string
  iat?: number
  exp?: number
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split('.')
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    return JSON.parse(decoded) as TokenPayload
  } catch {
    return null
  }
}
