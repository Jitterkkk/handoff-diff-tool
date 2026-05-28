import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function ok(body: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function fail(status: number, body: string): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('apiClient.authenticate', () => {
  it('faz POST /auth/plugin com os dados do usuário e retorna o token', async () => {
    mockFetch.mockResolvedValueOnce(ok({ token: 'jwt-abc' }));

    const token = await apiClient.authenticate({
      figmaUserId: 'user-1',
      name: 'Leo',
      avatarUrl: 'https://example.com/avatar.png',
    });

    expect(token).toBe('jwt-abc');
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/plugin');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string) as unknown;
    expect(body).toMatchObject({ figmaUserId: 'user-1', name: 'Leo' });
  });

  it('lança erro com mensagem clara quando a resposta não é ok', async () => {
    mockFetch.mockResolvedValueOnce(fail(401, 'Unauthorized'));

    await expect(
      apiClient.authenticate({ figmaUserId: 'x', name: 'Y' }),
    ).rejects.toThrow('API 401');
  });
});

describe('apiClient.publishReview', () => {
  it('inclui o token no header Authorization', async () => {
    mockFetch.mockResolvedValueOnce(ok({
      id: 'rev-uuid',
      frame_id: 'f1',
      frame_name: 'Login',
      status: 'pending',
      description: '',
      published_at: new Date().toISOString(),
      published_by_name: 'Leo',
      total_items: 1,
      checked_items: 0,
    }));

    await apiClient.publishReview('my-token', {
      fileKey: 'file-abc',
      frameName: 'Login',
      frameId: 'f1',
      description: '',
      publishedByUserId: 'user-1',
      publishedByName: 'Leo',
      items: [{
        nodeId: 'n1',
        nodeName: 'Button',
        type: 'COLOR',
        severity: 'high',
        before: '#fff',
        after: '#000',
      }],
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer my-token');
    expect(init.method).toBe('POST');
  });

  it('lança erro com mensagem clara quando response.ok === false', async () => {
    mockFetch.mockResolvedValueOnce(fail(400, 'Validation error'));

    await expect(
      apiClient.publishReview('tok', {
        fileKey: 'k',
        frameName: 'F',
        frameId: 'id',
        description: '',
        publishedByUserId: 'u',
        publishedByName: 'U',
        items: [],
      }),
    ).rejects.toThrow('API 400');
  });
});

describe('apiClient.getReviews', () => {
  it('transforma a resposta do backend para o formato do plugin', async () => {
    mockFetch.mockResolvedValueOnce(ok([{
      id: 'rev-1',
      frame_id: 'frame-1',
      frame_name: 'Home',
      status: 'pending',
      description: '',
      published_at: '2026-05-28T00:00:00.000Z',
      published_by_name: 'Designer',
      total_items: 3,
      checked_items: 1,
    }]));

    const reviews = await apiClient.getReviews('tok', 'file-key');

    expect(reviews).toHaveLength(1);
    expect(reviews[0].reviewId).toBe('rev-1');
    expect(reviews[0].frameId).toBe('frame-1');
    expect(reviews[0].totalItems).toBe(3);
    expect(reviews[0].pendingItems).toBe(2);
    expect(reviews[0].status).toBe('pending');
  });
});

describe('erros genéricos', () => {
  it('getReviews lança erro com mensagem clara quando response.ok === false', async () => {
    mockFetch.mockResolvedValueOnce(fail(500, 'Internal error'));

    await expect(
      apiClient.getReviews('tok', 'key'),
    ).rejects.toThrow('API 500');
  });
});
