import { describe, it, expect } from 'vitest';
import { diffSnapshots } from './diff';
import type { AutoLayoutSnapshot, NodeSnapshot, SerializablePaint } from '../shared/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function snap(id: string, overrides: Partial<Omit<NodeSnapshot, 'id'>> = {}): NodeSnapshot {
  return {
    id,
    name: 'Node',
    type: 'FRAME',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    fills: [],
    strokes: [],
    effects: [],
    opacity: 1,
    visible: true,
    children: [],
    ...overrides,
  };
}

function solid(r: number, g: number, b: number, a = 1): SerializablePaint {
  return { type: 'SOLID', color: { r, g, b, a }, visible: true, opacity: 1 };
}

function layout(overrides: Partial<AutoLayoutSnapshot> = {}): AutoLayoutSnapshot {
  return {
    layoutMode: 'HORIZONTAL',
    itemSpacing: 8,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    primaryAxisAlignItems: 'MIN',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('diffSnapshots', () => {
  it('retorna array vazio quando não há nenhuma mudança', () => {
    const node = snap('f1', { name: 'Frame', width: 200, height: 400 });
    expect(diffSnapshots(node, { ...node })).toEqual([]);
  });

  describe('cor de fill alterada', () => {
    it('detecta mudança de cor e retorna tipo COLOR com severidade high', () => {
      const before = snap('f1', { fills: [solid(1, 0, 0)] });
      const after  = snap('f1', { fills: [solid(0, 0, 1)] });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toMatchObject({
        nodeId:   'f1',
        type:     'COLOR',
        severity: 'high',
        before:   [solid(1, 0, 0)],
        after:    [solid(0, 0, 1)],
      });
    });

    it('não gera diff quando as cores são idênticas', () => {
      const fills = [solid(0.5, 0.5, 0.5)];
      const before = snap('f1', { fills });
      const after  = snap('f1', { fills: [solid(0.5, 0.5, 0.5)] });

      expect(diffSnapshots(before, after)).toEqual([]);
    });
  });

  describe('tamanho alterado', () => {
    it('detecta mudança de width e retorna tipo SIZE', () => {
      const before = snap('f1', { width: 100, height: 200 });
      const after  = snap('f1', { width: 300, height: 200 });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toMatchObject({
        type:   'SIZE',
        before: { width: 100, height: 200 },
        after:  { width: 300, height: 200 },
      });
    });

    it('detecta mudança de height e retorna tipo SIZE', () => {
      const before = snap('f1', { width: 100, height: 100 });
      const after  = snap('f1', { width: 100, height: 160 });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].type).toBe('SIZE');
    });

    it('atribui severidade high quando delta > 50px', () => {
      const before = snap('f1', { width: 100 });
      const after  = snap('f1', { width: 200 });

      expect(diffSnapshots(before, after)[0].severity).toBe('high');
    });

    it('atribui severidade medium quando delta está entre 11px e 50px', () => {
      const before = snap('f1', { width: 100 });
      const after  = snap('f1', { width: 130 });

      expect(diffSnapshots(before, after)[0].severity).toBe('medium');
    });

    it('atribui severidade low quando delta ≤ 10px', () => {
      const before = snap('f1', { width: 100 });
      const after  = snap('f1', { width: 105 });

      expect(diffSnapshots(before, after)[0].severity).toBe('low');
    });
  });

  describe('texto alterado', () => {
    it('detecta mudança em characters e retorna tipo CONTENT com severidade high', () => {
      const before = snap('t1', { type: 'TEXT', characters: 'Olá' });
      const after  = snap('t1', { type: 'TEXT', characters: 'Tchau' });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toMatchObject({
        nodeId:   't1',
        type:     'CONTENT',
        severity: 'high',
        before:   'Olá',
        after:    'Tchau',
      });
    });

    it('detecta mudança de fontSize e retorna tipo TYPOGRAPHY', () => {
      const before = snap('t1', { type: 'TEXT', characters: 'Texto', fontSize: 14 });
      const after  = snap('t1', { type: 'TEXT', characters: 'Texto', fontSize: 24 });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toMatchObject({
        type:     'TYPOGRAPHY',
        severity: 'high',
        before:   14,
        after:    24,
      });
    });
  });

  describe('componente trocado', () => {
    it('detecta mudança de componentId e retorna tipo COMPONENT com severidade high', () => {
      const before = snap('i1', { type: 'INSTANCE', componentId: 'comp-a' });
      const after  = snap('i1', { type: 'INSTANCE', componentId: 'comp-b' });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toMatchObject({
        nodeId:   'i1',
        type:     'COMPONENT',
        severity: 'high',
        before:   'comp-a',
        after:    'comp-b',
      });
    });
  });

  describe('filho adicionado', () => {
    it('detecta nó novo em after e retorna tipo ADDED com severidade medium', () => {
      const child  = snap('child-1', { name: 'Botão novo' });
      const before = snap('f1', { children: [] });
      const after  = snap('f1', { children: [child] });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toMatchObject({
        nodeId:   'child-1',
        nodeName: 'Botão novo',
        type:     'ADDED',
        severity: 'medium',
        before:   null,
      });
    });
  });

  describe('filho removido', () => {
    it('detecta nó ausente em after e retorna tipo REMOVED com severidade high', () => {
      const child  = snap('child-1', { name: 'Botão removido' });
      const before = snap('f1', { children: [child] });
      const after  = snap('f1', { children: [] });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toMatchObject({
        nodeId:   'child-1',
        nodeName: 'Botão removido',
        type:     'REMOVED',
        severity: 'high',
        after:    null,
      });
    });
  });

  describe('auto layout alterado', () => {
    it('detecta mudança de layoutMode e retorna tipo LAYOUT com severidade medium', () => {
      const before = snap('f1', { autoLayout: layout({ layoutMode: 'HORIZONTAL' }) });
      const after  = snap('f1', { autoLayout: layout({ layoutMode: 'VERTICAL' }) });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toMatchObject({
        nodeId:   'f1',
        type:     'LAYOUT',
        severity: 'medium',
      });
    });

    it('detecta mudança de itemSpacing', () => {
      const before = snap('f1', { autoLayout: layout({ itemSpacing: 8 }) });
      const after  = snap('f1', { autoLayout: layout({ itemSpacing: 16 }) });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].type).toBe('LAYOUT');
      expect(diffs[0].before).toMatchObject({ itemSpacing: 8 });
      expect(diffs[0].after).toMatchObject({ itemSpacing: 16 });
    });

    it('detecta mudança de padding', () => {
      const before = snap('f1', { autoLayout: layout({ paddingTop: 0, paddingLeft: 0 }) });
      const after  = snap('f1', { autoLayout: layout({ paddingTop: 16, paddingLeft: 16 }) });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].type).toBe('LAYOUT');
    });

    it('detecta mudança de primaryAxisAlignItems', () => {
      const before = snap('f1', { autoLayout: layout({ primaryAxisAlignItems: 'MIN' }) });
      const after  = snap('f1', { autoLayout: layout({ primaryAxisAlignItems: 'CENTER' }) });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].type).toBe('LAYOUT');
    });

    it('detecta auto layout adicionado (undefined → definido)', () => {
      const before = snap('f1', { autoLayout: undefined });
      const after  = snap('f1', { autoLayout: layout() });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toMatchObject({
        type:     'LAYOUT',
        severity: 'medium',
        before:   null,
      });
    });

    it('detecta auto layout removido (definido → undefined)', () => {
      const before = snap('f1', { autoLayout: layout() });
      const after  = snap('f1', { autoLayout: undefined });

      const diffs = diffSnapshots(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toMatchObject({
        type:   'LAYOUT',
        after:  null,
      });
    });

    it('não gera diff quando auto layout é idêntico', () => {
      const before = snap('f1', { autoLayout: layout({ itemSpacing: 12, paddingTop: 8 }) });
      const after  = snap('f1', { autoLayout: layout({ itemSpacing: 12, paddingTop: 8 }) });

      expect(diffSnapshots(before, after)).toEqual([]);
    });

    it('não gera diff quando ambos não têm auto layout', () => {
      const before = snap('f1');
      const after  = snap('f1');

      expect(diffSnapshots(before, after)).toEqual([]);
    });
  });

  describe('múltiplas mudanças simultâneas', () => {
    it('retorna um diff por propriedade alterada no mesmo nó', () => {
      const before = snap('f1', { width: 100, fills: [solid(1, 0, 0)] });
      const after  = snap('f1', { width: 300, fills: [solid(0, 0, 1)] });

      const diffs = diffSnapshots(before, after);
      const types = diffs.map((d) => d.type).sort();

      expect(types).toEqual(['COLOR', 'SIZE']);
    });
  });
});
