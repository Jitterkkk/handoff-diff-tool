import type { ReviewSummary, ReviewDetail, PublicReview } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://handoff-api.onrender.com'

interface ApiOptions {
  token: string
}

async function request<T>(
  path: string,
  opts: ApiOptions & { method?: string; body?: string },
): Promise<T> {
  const { token, method = 'GET', body } = opts
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

export async function getReviews(opts: ApiOptions, fileKey?: string): Promise<ReviewSummary[]> {
  const qs = fileKey ? `?fileKey=${encodeURIComponent(fileKey)}` : ''
  return request<ReviewSummary[]>(`/api/reviews${qs}`, opts)
}

export async function getReviewDetail(opts: ApiOptions, reviewId: string): Promise<ReviewDetail> {
  return request<ReviewDetail>(`/api/reviews/${reviewId}`, opts)
}

export async function getPublicReview(reviewId: string): Promise<PublicReview> {
  const res = await fetch(`${API_BASE}/api/reviews/${reviewId}/public`, { cache: 'no-store' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<PublicReview>
}

export async function checkItem(
  opts: ApiOptions,
  reviewId: string,
  itemId: string,
  checked: boolean,
): Promise<ReviewDetail> {
  return request<ReviewDetail>(`/api/reviews/${reviewId}/items/${itemId}`, {
    ...opts,
    method: 'PATCH',
    body: JSON.stringify({ checked }),
  })
}
