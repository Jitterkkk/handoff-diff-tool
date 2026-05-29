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

describe('authenticate — dados do figma.currentUser', () => {
  it('envia figmaUserId e name exatos fornecidos pelo chamador', async () => {
    mockFetch.mockResolvedValueOnce(ok({ token: 'token-xyz' }));

    await apiClient.authenticate({
      figmaUserId: 'figma-user-abc',
      name: 'Designer Name',
      avatarUrl: 'https://cdn.figma.com/avatar.png',
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['figmaUserId']).toBe('figma-user-abc');
    expect(body['name']).toBe('Designer Name');
    expect(body['avatarUrl']).toBe('https://cdn.figma.com/avatar.png');
  });
});

describe('publishReview — fileKey correto', () => {
  it('inclui o fileKey no payload enviado ao backend', async () => {
    mockFetch.mockResolvedValueOnce(ok({
      id: 'rev-id',
      frame_id: 'f1',
      frame_name: 'Home',
      status: 'pending',
      description: '',
      published_at: new Date().toISOString(),
      published_by_name: 'Dev',
      total_items: 0,
      checked_items: 0,
    }));

    await apiClient.publishReview('tok', {
      fileKey: 'abc123-real-file-key',
      frameName: 'Home',
      frameId: 'f1',
      description: '',
      publishedByUserId: 'u1',
      publishedByName: 'Dev',
      items: [],
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['fileKey']).toBe('abc123-real-file-key');
  });
});

describe('modo offline gracioso', () => {
  it('publishReview lança erro capturável — o chamador é responsável por tratar silenciosamente', async () => {
    mockFetch.mockRejectedValueOnce(new Error('NetworkError: Failed to fetch'));

    let caught = false;
    try {
      await apiClient.publishReview('tok', {
        fileKey: 'fk',
        frameName: 'F',
        frameId: 'id',
        description: '',
        publishedByUserId: 'u',
        publishedByName: 'U',
        items: [],
      });
    } catch {
      caught = true;
    }
    // O erro é capturável (não uncaught). Em code.ts é capturado com try/catch
    // e o fluxo local continua normalmente.
    expect(caught).toBe(true);
  });
});
