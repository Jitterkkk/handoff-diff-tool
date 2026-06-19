import type { ReviewSummary, ReviewDetail, ReviewsPage, PublicReview, FileWithStats, Workspace, WorkspaceWithRole } from './types'

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
  opts: ApiOptions & { fileKey?: string; status?: string; limit?: number; offset?: number; workspaceId?: string },
): Promise<ReviewsPage> {
  const { token, fileKey, status, limit = 20, offset = 0, workspaceId } = opts
  const params = new URLSearchParams()
  if (fileKey) params.set('fileKey', fileKey)
  if (status) params.set('status', status)
  if (workspaceId) params.set('workspaceId', workspaceId)
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
  comment?: string,
): Promise<ReviewDetail> {
  return request<ReviewDetail>(`/api/reviews/${reviewId}/items/${itemId}`, {
    ...opts,
    method: 'PATCH',
    body: JSON.stringify({ checked, ...(comment !== undefined ? { comment } : {}) }),
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

export async function getFiles(opts: ApiOptions): Promise<FileWithStats[]> {
  return request<FileWithStats[]>('/api/files', opts)
}

export async function getSlackIntegration(
  opts: ApiOptions,
): Promise<{ webhookUrl: string; enabled: boolean } | null> {
  try {
    const text = await fetch(`${API_BASE}/api/slack/webhook`, {
      headers: { Authorization: `Bearer ${opts.token}` },
      cache: 'no-store',
    }).then(r => (r.ok ? r.text() : null))
    if (!text) return null
    return JSON.parse(text) as { webhookUrl: string; enabled: boolean } | null
  } catch {
    return null
  }
}

export async function getWorkspaces(opts: ApiOptions): Promise<WorkspaceWithRole[]> {
  return request<WorkspaceWithRole[]>('/api/workspaces', opts)
}

export async function createWorkspace(opts: ApiOptions, name: string): Promise<Workspace> {
  return request<Workspace>('/api/workspaces', { ...opts, method: 'POST', body: JSON.stringify({ name }) })
}

export async function generateInvite(
  opts: ApiOptions,
  workspaceId: string,
): Promise<{ token: string; url: string }> {
  return request<{ token: string; url: string }>(
    `/api/workspaces/${workspaceId}/invite`,
    { ...opts, method: 'POST' },
  )
}

export async function joinWorkspace(opts: ApiOptions, inviteToken: string): Promise<Workspace> {
  return request<Workspace>(`/api/workspaces/join/${inviteToken}`, { ...opts, method: 'POST' })
}

export async function getFileReviews(
  opts: ApiOptions & { fileKey: string; status?: string; limit?: number; offset?: number },
): Promise<ReviewsPage> {
  const { token, fileKey, status, limit = 20, offset = 0 } = opts
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  return request<ReviewsPage>(`/api/files/${encodeURIComponent(fileKey)}/reviews?${params.toString()}`, { token })
}
