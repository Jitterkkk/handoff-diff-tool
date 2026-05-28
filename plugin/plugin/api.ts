/// <reference types="@figma/plugin-typings" />

import type { DiffResult, ReviewSummary } from '../shared/types';

const API_BASE = 'https://handoff-api.onrender.com';

// ─── Backend response shapes (snake_case, as returned by the API) ─────────────

export interface BackendReviewItem {
  id: string;
  node_id: string;
  node_name: string;
  diff_type: string;
  severity: 'high' | 'medium' | 'low';
  before_value: unknown;
  after_value: unknown;
  checked_at: string | null;
}

export interface BackendReview {
  id: string;
  frame_id: string;
  frame_name: string;
  status: 'pending' | 'in_progress' | 'done';
  description: string;
  published_at: string;
  published_by_name: string;
  total_items: number;
  checked_items: number;
  items?: BackendReviewItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: { token?: string; method?: string; body?: string; timeout?: number } = {},
): Promise<T> {
  const { token, method = 'GET', body, timeout = 10000 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error('API ' + res.status + ' at ' + path + ': ' + text);
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

function toPluginReviewSummary(r: BackendReview): ReviewSummary {
  return {
    frameId: r.frame_id,
    frameName: r.frame_name,
    reviewId: r.id,
    publishedAt: new Date(r.published_at).getTime(),
    publishedBy: r.published_by_name,
    totalItems: r.total_items,
    pendingItems: r.total_items - r.checked_items,
    status: r.status,
  };
}

// ─── Interface & implementation ───────────────────────────────────────────────

export interface ApiClient {
  authenticate(user: { figmaUserId: string; name: string; avatarUrl?: string }): Promise<string>;
  publishReview(token: string, payload: {
    fileKey: string;
    frameName: string;
    frameId: string;
    description: string;
    publishedByUserId: string;
    publishedByName: string;
    items: DiffResult[];
  }): Promise<BackendReview>;
  getReviews(token: string, fileKey: string): Promise<ReviewSummary[]>;
  getReviewDetail(token: string, reviewId: string): Promise<BackendReview>;
  checkItem(token: string, reviewId: string, itemId: string, checked: boolean): Promise<BackendReview>;
}

class ApiClientImpl implements ApiClient {
  async authenticate(user: { figmaUserId: string; name: string; avatarUrl?: string }): Promise<string> {
    const data = await request<{ token: string }>('/auth/plugin', {
      method: 'POST',
      body: JSON.stringify(user),
    });
    return data.token;
  }

  async publishReview(token: string, payload: {
    fileKey: string;
    frameName: string;
    frameId: string;
    description: string;
    publishedByUserId: string;
    publishedByName: string;
    items: DiffResult[];
  }): Promise<BackendReview> {
    return request<BackendReview>('/api/reviews', {
      method: 'POST',
      token,
      body: JSON.stringify({
        fileKey: payload.fileKey,
        fileName: 'Figma File',
        frameId: payload.frameId,
        frameName: payload.frameName,
        description: payload.description,
        publishedBy: {
          figmaUserId: payload.publishedByUserId,
          name: payload.publishedByName,
        },
        items: payload.items.map(i => ({
          nodeId: i.nodeId,
          nodeName: i.nodeName,
          type: i.type,
          severity: i.severity,
          before: i.before,
          after: i.after,
        })),
      }),
    });
  }

  async getReviews(token: string, fileKey: string): Promise<ReviewSummary[]> {
    const data = await request<BackendReview[]>(
      '/api/reviews?fileKey=' + encodeURIComponent(fileKey),
      { token },
    );
    return data.map(toPluginReviewSummary);
  }

  async getReviewDetail(token: string, reviewId: string): Promise<BackendReview> {
    return request<BackendReview>('/api/reviews/' + reviewId, { token });
  }

  async checkItem(token: string, reviewId: string, itemId: string, checked: boolean): Promise<BackendReview> {
    return request<BackendReview>('/api/reviews/' + reviewId + '/items/' + itemId, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ checked }),
    });
  }
}

export const apiClient: ApiClient = new ApiClientImpl();
