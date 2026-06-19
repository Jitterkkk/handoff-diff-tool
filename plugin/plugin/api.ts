/// <reference types="@figma/plugin-typings" />

import type { DiffResult, ReviewSummary, WorkspaceSummary } from '../shared/types';

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
  const { token, method = 'GET', body, timeout = 35000 } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const fetchPromise = fetch(API_BASE + path, { method, headers, body })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const error = new Error('API ' + res.status + ' at ' + path + ': ' + text);
        (error as { status?: number }).status = res.status;
        throw error;
      }
      return res.json() as Promise<T>;
    });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout (' + timeout + 'ms): ' + path)), timeout),
  );

  return Promise.race([fetchPromise, timeoutPromise]);
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
  wakeUp(): Promise<void>;
  authenticate(user: { figmaUserId: string; name: string; avatarUrl?: string }): Promise<string>;
  publishReview(token: string, payload: {
    fileKey: string;
    fileName: string;
    frameName: string;
    frameId: string;
    description: string;
    publishedByUserId: string;
    publishedByName: string;
    items: DiffResult[];
    workspaceId?: string;
  }): Promise<BackendReview>;
  getWorkspaces(token: string): Promise<WorkspaceSummary[]>;
  getReviews(token: string, fileKey: string): Promise<ReviewSummary[]>;
  getReviewDetail(token: string, reviewId: string): Promise<BackendReview>;
  checkItem(token: string, reviewId: string, itemId: string, checked: boolean): Promise<BackendReview>;
}

class ApiClientImpl implements ApiClient {
  async wakeUp(): Promise<void> {
    try {
      await request<unknown>('/health', { timeout: 35000 });
    } catch {
      // ignora erro — só queremos acordar o servidor
    }
  }

  async authenticate(user: { figmaUserId: string; name: string; avatarUrl?: string }): Promise<string> {
    const data = await request<{ token: string }>('/auth/plugin', {
      method: 'POST',
      body: JSON.stringify(user),
    });
    return data.token;
  }

  async publishReview(token: string, payload: {
    fileKey: string;
    fileName: string;
    frameName: string;
    frameId: string;
    description: string;
    publishedByUserId: string;
    publishedByName: string;
    items: DiffResult[];
    workspaceId?: string;
  }): Promise<BackendReview> {
    return request<BackendReview>('/api/reviews', {
      method: 'POST',
      token,
      body: JSON.stringify({
        fileKey: payload.fileKey,
        fileName: payload.fileName,
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
        ...(payload.workspaceId ? { workspaceId: payload.workspaceId } : {}),
      }),
    });
  }

  async getWorkspaces(token: string): Promise<WorkspaceSummary[]> {
    const data = await request<Array<{ id: string; name: string; role: 'owner' | 'member' }>>(
      '/api/workspaces',
      { token },
    );
    return data.map(w => ({ id: w.id, name: w.name, role: w.role }));
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
