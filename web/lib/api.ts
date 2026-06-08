import type { ReviewSummary, ReviewDetail, ReviewsPage, PublicReview } from './types'

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

export async function getReviews(
  opts: ApiOptions & { fileKey?: string; status?: string; limit?: number; offset?: number },
): Promise<ReviewsPage> {
  const { token, fileKey, status, limit = 20, offset = 0 } = opts
  const params = new URLSearchParams()
  if (fileKey) params.set('fileKey', fileKey)
  if (status) params.set('status', status)
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  return request<ReviewsPage>(`/api/reviews?${params.toString()}`, { token })
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

export async function deleteReview(opts: ApiOptions, reviewId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${opts.token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
}

export async function archiveReview(opts: ApiOptions, reviewId: string): Promise<void> {
  await request<unknown>(`/api/reviews/${reviewId}/archive`, { ...opts, method: 'PATCH' })
}
