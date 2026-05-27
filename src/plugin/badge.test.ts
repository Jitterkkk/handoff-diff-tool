import { describe, it, expect } from 'vitest';
import { BADGE_COLORS, computePendingCount } from './reviewUtils';
import type { ReviewItem } from '../shared/types';

function makeItem(checkedAt: number | null): ReviewItem {
  return {
    diffResult: {
      nodeId: 'n1',
      nodeName: 'Node',
      type: 'COLOR',
      before: null,
      after: null,
      severity: 'medium',
    },
    checkedAt,
    checkedBy: checkedAt !== null ? 'Dev' : null,
  };
}

describe('BADGE_COLORS', () => {
  it('tem as três chaves de status', () => {
    expect(BADGE_COLORS).toHaveProperty('pending');
    expect(BADGE_COLORS).toHaveProperty('in_progress');
    expect(BADGE_COLORS).toHaveProperty('done');
  });

  it.each(['pending', 'in_progress', 'done'] as const)(
    '%s tem valores RGB no range 0-1',
    (key) => {
      const { r, g, b } = BADGE_COLORS[key];
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    },
  );
});

describe('computePendingCount', () => {
  it('retorna 0 quando todos os itens estão revisados', () => {
    expect(computePendingCount([makeItem(1000), makeItem(2000)])).toBe(0);
  });

  it('retorna o total quando nenhum foi revisado', () => {
    expect(computePendingCount([makeItem(null), makeItem(null)])).toBe(2);
  });

  it('conta apenas os itens com checkedAt null', () => {
    expect(computePendingCount([makeItem(null), makeItem(1000), makeItem(null)])).toBe(2);
  });

  it('retorna 0 para lista vazia', () => {
    expect(computePendingCount([])).toBe(0);
  });
});
