/// <reference types="@figma/plugin-typings" />

import { loadReview } from './storage';

const BADGE_PREFIX = 'handoff:badge:';

const BADGE_COLORS: Record<'pending' | 'in_progress' | 'done', { r: number; g: number; b: number }> = {
  pending:     { r: 0.937, g: 0.267, b: 0.267 },
  in_progress: { r: 0.960, g: 0.620, b: 0.043 },
  done:        { r: 0.133, g: 0.694, b: 0.298 },
};

interface ReviewBadgeData {
  reviewId: string;
  status: 'pending' | 'in_progress' | 'done';
  pendingItems: number;
}

export async function upsertBadge(frame: FrameNode, review: ReviewBadgeData): Promise<void> {
  removeBadge(frame);

  const color = BADGE_COLORS[review.status];

  const badge = figma.createFrame();
  badge.name = BADGE_PREFIX + review.reviewId;
  badge.resize(24, 24);
  badge.x = frame.width - 28;
  badge.y = -12;
  badge.cornerRadius = 12;
  badge.fills = [{ type: 'SOLID' as const, color }];
  badge.locked = true;
  badge.clipsContent = true;

  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

  const text = figma.createText();
  text.fontName = { family: 'Inter', style: 'Bold' };
  text.fontSize = 11;
  text.textAutoResize = 'NONE';
  text.resize(24, 24);
  text.characters = review.pendingItems > 0 ? String(review.pendingItems) : '✓';
  text.fills = [{ type: 'SOLID' as const, color: { r: 1, g: 1, b: 1 } }];
  text.textAlignHorizontal = 'CENTER';
  text.textAlignVertical = 'CENTER';

  badge.appendChild(text);
  frame.appendChild(badge);
}

export function removeBadge(frame: FrameNode): void {
  const toRemove = frame.children.filter(c => c.name.startsWith(BADGE_PREFIX));
  for (let i = 0; i < toRemove.length; i++) {
    toRemove[i].remove();
  }
}

export async function refreshBadge(frameId: string): Promise<void> {
  try {
    const node = figma.getNodeById(frameId);
    if (node === null || node.type !== 'FRAME') return;
    const frame = node as FrameNode;

    const review = await loadReview(frameId);
    if (review === null) {
      removeBadge(frame);
      return;
    }

    const pendingItems = review.items.filter(i => i.checkedAt === null).length;
    await upsertBadge(frame, {
      reviewId: review.reviewId,
      status: review.status,
      pendingItems,
    });
  } catch (err) {
    void err;
  }
}
