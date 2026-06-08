/// <reference types="@figma/plugin-typings" />

import LZString from 'lz-string';
import type { NodeSnapshot, SnapshotHistory, SnapshotEntryMeta, FrameReview, ReviewSummary } from '../shared/types';
import { computeReviewStatus } from './reviewUtils';

const HISTORY_PREFIX = 'handoff:history:';
const MAX_ENTRIES = 5;
const MAX_COMPRESSED_CHARS = 900 * 1024;

export async function saveToHistory(
  frameId: string,
  frameName: string,
  snapshot: NodeSnapshot,
  label?: string,
): Promise<SnapshotHistory> {
  const existing = await loadHistory(frameId);

  const newEntry = { savedAt: Date.now(), snapshot, ...(label ? { label } : {}) };
  const entries = [...(existing?.entries ?? []), newEntry].slice(-MAX_ENTRIES);
  const history: SnapshotHistory = { frameId, frameName, entries };

  const compressed = LZString.compressToBase64(JSON.stringify(history));
  if (compressed.length > MAX_COMPRESSED_CHARS) {
    throw new Error(
      'Frame muito complexo para salvar. Tente selecionar um frame com menos layers.',
    );
  }

  await figma.clientStorage.setAsync(`${HISTORY_PREFIX}${frameId}`, compressed);
  return history;
}

export async function clearFrameHistory(frameId: string): Promise<void> {
  await figma.clientStorage.deleteAsync(`${HISTORY_PREFIX}${frameId}`);
}

export async function loadHistory(frameId: string): Promise<SnapshotHistory | null> {
  const value: unknown = await figma.clientStorage.getAsync(`${HISTORY_PREFIX}${frameId}`);

  if (value == null) return null;
  if (typeof value !== 'string') return value as SnapshotHistory;

  const json = LZString.decompressFromBase64(value);
  if (json == null) return null;

  return JSON.parse(json) as SnapshotHistory;
}

const SETTINGS_KEY = 'handoff:settings';

export interface Settings {
  includePosition: boolean;
}

const DEFAULT_SETTINGS: Settings = { includePosition: false };

export async function loadSettings(): Promise<Settings> {
  const value: unknown = await figma.clientStorage.getAsync(SETTINGS_KEY);
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS };
  const s = value as Partial<Settings>;
  return { includePosition: s.includePosition ?? false };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await figma.clientStorage.setAsync(SETTINGS_KEY, settings);
}

export function toMetaEntries(history: SnapshotHistory | null): SnapshotEntryMeta[] {
  if (!history) return [];
  return history.entries.map((e, i) => ({
    index: i,
    savedAt: e.savedAt,
    ...(e.label ? { label: e.label } : {}),
  }));
}

// ─── Auth token storage ───────────────────────────────────────────────────────

const AUTH_TOKEN_KEY = 'handoff:auth:token';

export async function saveAuthToken(token: string): Promise<void> {
  await figma.clientStorage.setAsync(AUTH_TOKEN_KEY, token);
}

export async function loadAuthToken(): Promise<string | null> {
  const value: unknown = await figma.clientStorage.getAsync(AUTH_TOKEN_KEY);
  return typeof value === 'string' ? value : null;
}

export async function clearAuthToken(): Promise<void> {
  await figma.clientStorage.deleteAsync(AUTH_TOKEN_KEY);
}

// ─── Review storage ───────────────────────────────────────────────────────────

const REVIEW_PREFIX = 'handoff:review:';

export async function saveReview(review: FrameReview): Promise<void> {
  await figma.clientStorage.setAsync(`${REVIEW_PREFIX}${review.frameId}`, JSON.stringify(review));
}

export async function loadReview(frameId: string): Promise<FrameReview | null> {
  const value: unknown = await figma.clientStorage.getAsync(`${REVIEW_PREFIX}${frameId}`);
  if (value == null) return null;
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  return JSON.parse(json) as FrameReview;
}

export async function loadAllReviews(): Promise<ReviewSummary[]> {
  const keys: string[] = await figma.clientStorage.keysAsync();
  const reviewKeys = keys.filter(k => k.startsWith(REVIEW_PREFIX));

  const reviews = await Promise.all(
    reviewKeys.map(async (key) => {
      const frameId = key.slice(REVIEW_PREFIX.length);
      return loadReview(frameId);
    }),
  );

  return reviews
    .filter((r): r is FrameReview => r !== null)
    .map((r): ReviewSummary => ({
      frameId: r.frameId,
      frameName: r.frameName,
      reviewId: r.reviewId,
      publishedAt: r.publishedAt,
      publishedBy: r.publishedBy,
      totalItems: r.items.length,
      pendingItems: r.items.filter(i => i.checkedAt === null).length,
      status: r.status,
    }))
    .sort((a, b) => b.publishedAt - a.publishedAt);
}

export async function updateReviewItem(
  frameId: string,
  nodeId: string,
  diffType: string,
  checked: boolean,
  checkedBy: string,
): Promise<FrameReview | null> {
  const review = await loadReview(frameId);
  if (!review) return null;

  review.items = review.items.map(item => {
    if (item.diffResult.nodeId === nodeId && item.diffResult.type === diffType) {
      return {
        ...item,
        checkedAt: checked ? Date.now() : null,
        checkedBy: checked ? checkedBy : null,
      };
    }
    return item;
  });

  review.status = computeReviewStatus(review.items);

  await saveReview(review);
  return review;
}
