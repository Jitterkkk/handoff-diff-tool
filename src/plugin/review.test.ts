import { describe, it, expect } from 'vitest';
import { computeReviewStatus, applyItemCheck } from './reviewUtils';
import type { DiffResult, FrameReview, ReviewItem } from '../shared/types';

function makeDiff(nodeId: string, diffType: DiffResult['type'] = 'COLOR'): DiffResult {
  return {
    nodeId,
    nodeName: 'Node ' + nodeId,
    type: diffType,
    before: null,
    after: null,
    severity: 'medium',
  };
}

function makeItem(nodeId: string, checkedAt: number | null = null): ReviewItem {
  return {
    diffResult: makeDiff(nodeId),
    checkedAt,
    checkedBy: checkedAt !== null ? 'Dev' : null,
  };
}

function makeReview(items: ReviewItem[]): FrameReview {
  return {
    reviewId: 'rev1',
    frameId: 'frame1',
    frameName: 'Frame 1',
    publishedAt: 1000,
    publishedBy: 'Designer',
    description: '',
    items,
    status: computeReviewStatus(items),
  };
}

describe('ReviewItem', () => {
  it('recém-criado tem checkedAt null e checkedBy null', () => {
    const item = makeItem('n1');
    expect(item.checkedAt).toBeNull();
    expect(item.checkedBy).toBeNull();
  });
});

describe('computeReviewStatus', () => {
  it('retorna pending quando todos checkedAt são null', () => {
    expect(computeReviewStatus([makeItem('n1'), makeItem('n2')])).toBe('pending');
  });

  it('retorna done quando todos checkedAt estão preenchidos', () => {
    expect(computeReviewStatus([makeItem('n1', 1000), makeItem('n2', 2000)])).toBe('done');
  });

  it('retorna in_progress quando há mix de checados e não checados', () => {
    expect(computeReviewStatus([makeItem('n1', 1000), makeItem('n2')])).toBe('in_progress');
  });

  it('retorna pending para lista vazia', () => {
    expect(computeReviewStatus([])).toBe('pending');
  });
});

describe('applyItemCheck', () => {
  it('atualiza checkedAt para um timestamp quando checked = true', () => {
    const review = makeReview([makeItem('n1'), makeItem('n2')]);
    const updated = applyItemCheck(review, 'n1', 'COLOR', true, 'Dev');
    const item = updated.items.find(i => i.diffResult.nodeId === 'n1')!;
    expect(item.checkedAt).not.toBeNull();
    expect(item.checkedBy).toBe('Dev');
  });

  it('reseta checkedAt para null quando checked = false', () => {
    const review = makeReview([makeItem('n1', 1000)]);
    const updated = applyItemCheck(review, 'n1', 'COLOR', false, 'Dev');
    const item = updated.items.find(i => i.diffResult.nodeId === 'n1')!;
    expect(item.checkedAt).toBeNull();
    expect(item.checkedBy).toBeNull();
  });

  it('transição pending → in_progress ao marcar o primeiro item', () => {
    const review = makeReview([makeItem('n1'), makeItem('n2')]);
    expect(review.status).toBe('pending');
    const updated = applyItemCheck(review, 'n1', 'COLOR', true, 'Dev');
    expect(updated.status).toBe('in_progress');
  });

  it('transição in_progress → done ao marcar o último item', () => {
    const review = makeReview([makeItem('n1', 1000), makeItem('n2')]);
    expect(review.status).toBe('in_progress');
    const updated = applyItemCheck(review, 'n2', 'COLOR', true, 'Dev');
    expect(updated.status).toBe('done');
  });

  it('transição done → in_progress ao desmarcar um item', () => {
    const review = makeReview([makeItem('n1', 1000), makeItem('n2', 2000)]);
    expect(review.status).toBe('done');
    const updated = applyItemCheck(review, 'n1', 'COLOR', false, 'Dev');
    expect(updated.status).toBe('in_progress');
  });

  it('não modifica outros itens ao checar um específico', () => {
    const review = makeReview([makeItem('n1'), makeItem('n2')]);
    const updated = applyItemCheck(review, 'n1', 'COLOR', true, 'Dev');
    const n2 = updated.items.find(i => i.diffResult.nodeId === 'n2')!;
    expect(n2.checkedAt).toBeNull();
  });
});
