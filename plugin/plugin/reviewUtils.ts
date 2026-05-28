import type { FrameReview, ReviewItem } from '../shared/types';

export const BADGE_COLORS: Record<'pending' | 'in_progress' | 'done', { r: number; g: number; b: number }> = {
  pending:     { r: 0.937, g: 0.267, b: 0.267 },
  in_progress: { r: 0.960, g: 0.620, b: 0.043 },
  done:        { r: 0.133, g: 0.694, b: 0.298 },
};

export function computePendingCount(items: ReviewItem[]): number {
  return items.filter(i => i.checkedAt === null).length;
}

export function computeReviewStatus(items: ReviewItem[]): 'pending' | 'in_progress' | 'done' {
  const checkedCount = items.filter(i => i.checkedAt !== null).length;
  if (checkedCount === 0) return 'pending';
  if (checkedCount === items.length) return 'done';
  return 'in_progress';
}

export function applyItemCheck(
  review: FrameReview,
  nodeId: string,
  diffType: string,
  checked: boolean,
  checkedBy: string,
): FrameReview {
  const items = review.items.map(item => {
    if (item.diffResult.nodeId === nodeId && item.diffResult.type === diffType) {
      return {
        ...item,
        checkedAt: checked ? Date.now() : null,
        checkedBy: checked ? checkedBy : null,
      };
    }
    return item;
  });
  return { ...review, items, status: computeReviewStatus(items) };
}
