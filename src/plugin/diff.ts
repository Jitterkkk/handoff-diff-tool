import type {
  DiffResult,
  DiffType,
  NodeSnapshot,
  RGBA,
  SerializablePaint,
  Severity,
} from '../shared/types';

function rgbaEqual(a: RGBA, b: RGBA): boolean {
  return (
    Math.abs(a.r - b.r) <= 0.01 &&
    Math.abs(a.g - b.g) <= 0.01 &&
    Math.abs(a.b - b.b) <= 0.01 &&
    Math.abs(a.a - b.a) <= 0.01
  );
}

function paintsEqual(a: SerializablePaint, b: SerializablePaint): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'SOLID' && b.type === 'SOLID') {
    return rgbaEqual(a.color, b.color) && Math.abs(a.opacity - b.opacity) <= 0.01;
  }
  return Math.abs(a.opacity - b.opacity) <= 0.01;
}

function paintListsEqual(a: SerializablePaint[], b: SerializablePaint[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((paint, i) => paintsEqual(paint, b[i]));
}

function sizeSeverity(before: NodeSnapshot, after: NodeSnapshot): Severity {
  const delta = Math.max(
    Math.abs(after.width - before.width),
    Math.abs(after.height - before.height),
  );
  if (delta > 50) return 'high';
  if (delta > 10) return 'medium';
  return 'low';
}

function push(
  results: DiffResult[],
  nodeId: string,
  nodeName: string,
  type: DiffType,
  before: unknown,
  after: unknown,
  severity: Severity,
): void {
  results.push({ nodeId, nodeName, type, before, after, severity });
}

function diffNodes(
  before: NodeSnapshot,
  after: NodeSnapshot,
  results: DiffResult[],
): void {
  const id = after.id;
  const name = after.name;

  if (before.width !== after.width || before.height !== after.height) {
    push(
      results,
      id,
      name,
      'SIZE',
      { width: before.width, height: before.height },
      { width: after.width, height: after.height },
      sizeSeverity(before, after),
    );
  }

  if (!paintListsEqual(before.fills, after.fills)) {
    push(results, id, name, 'COLOR', before.fills, after.fills, 'high');
  }

  if (!paintListsEqual(before.strokes, after.strokes)) {
    push(results, id, name, 'COLOR', before.strokes, after.strokes, 'medium');
  }

  if (before.visible !== after.visible) {
    push(results, id, name, 'CONTENT', before.visible, after.visible, 'medium');
  }

  if (Math.abs(before.opacity - after.opacity) > 0.01) {
    push(results, id, name, 'CONTENT', before.opacity, after.opacity, 'low');
  }

  if (before.type === 'TEXT' && after.type === 'TEXT') {
    if (before.characters !== after.characters) {
      push(results, id, name, 'CONTENT', before.characters, after.characters, 'high');
    }
    if (before.fontSize !== after.fontSize) {
      push(results, id, name, 'TYPOGRAPHY', before.fontSize, after.fontSize, 'high');
    }
  }

  if (before.componentId !== after.componentId) {
    push(results, id, name, 'COMPONENT', before.componentId, after.componentId, 'high');
  }
}

function buildIndex(root: NodeSnapshot): Map<string, NodeSnapshot> {
  const map = new Map<string, NodeSnapshot>();
  const walk = (node: NodeSnapshot): void => {
    map.set(node.id, node);
    node.children.forEach(walk);
  };
  walk(root);
  return map;
}

export function diffSnapshots(
  before: NodeSnapshot,
  after: NodeSnapshot,
): DiffResult[] {
  const results: DiffResult[] = [];
  const beforeIndex = buildIndex(before);
  const afterIndex = buildIndex(after);

  afterIndex.forEach((afterNode, id) => {
    const beforeNode = beforeIndex.get(id);
    if (!beforeNode) {
      push(results, id, afterNode.name, 'ADDED', null, afterNode.name, 'medium');
    } else {
      diffNodes(beforeNode, afterNode, results);
    }
  });

  beforeIndex.forEach((beforeNode, id) => {
    if (!afterIndex.has(id)) {
      push(results, id, beforeNode.name, 'REMOVED', beforeNode.name, null, 'high');
    }
  });

  return results;
}
