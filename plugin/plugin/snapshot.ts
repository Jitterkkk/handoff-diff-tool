/// <reference types="@figma/plugin-typings" />

import type {
  NodeSnapshot,
  SerializablePaint,
  SerializableEffect,
  AutoLayoutSnapshot,
  RGBA,
} from '../shared/types';

function serializePaint(paint: Paint): SerializablePaint {
  const base = { visible: paint.visible ?? true, opacity: paint.opacity ?? 1 };

  if (paint.type === 'SOLID') {
    const color: RGBA = {
      r: paint.color.r,
      g: paint.color.g,
      b: paint.color.b,
      a: paint.opacity ?? 1,
    };
    return { type: 'SOLID', color, ...base };
  }

  if (
    paint.type === 'GRADIENT_LINEAR' ||
    paint.type === 'GRADIENT_RADIAL' ||
    paint.type === 'GRADIENT_ANGULAR' ||
    paint.type === 'GRADIENT_DIAMOND'
  ) {
    return { type: paint.type, ...base };
  }

  if (paint.type === 'IMAGE') {
    return { type: 'IMAGE', ...base };
  }

  return { type: paint.type, ...base };
}

function serializeEffect(effect: Effect): SerializableEffect {
  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    return {
      type: effect.type,
      visible: effect.visible,
      radius: effect.radius,
      color: effect.color,
    };
  }

  if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
    return {
      type: effect.type,
      visible: effect.visible,
      radius: effect.radius,
    };
  }

  return { type: effect.type, visible: effect.visible };
}

function hasLayout(
  node: SceneNode,
): node is SceneNode & { x: number; y: number; width: number; height: number } {
  return 'x' in node && 'y' in node && 'width' in node && 'height' in node;
}

function hasFills(
  node: SceneNode,
): node is SceneNode & {
  fills: ReadonlyArray<Paint> | typeof figma.mixed;
  strokes: ReadonlyArray<Paint>;
} {
  return 'fills' in node && 'strokes' in node;
}

function hasEffects(
  node: SceneNode,
): node is SceneNode & { effects: ReadonlyArray<Effect> } {
  return 'effects' in node;
}

function hasOpacity(node: SceneNode): node is SceneNode & { opacity: number } {
  return 'opacity' in node;
}

function hasVisible(node: SceneNode): node is SceneNode & { visible: boolean } {
  return 'visible' in node;
}

function hasChildren(
  node: SceneNode,
): node is SceneNode & { children: readonly SceneNode[] } {
  return 'children' in node;
}

interface AutoLayoutProps {
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  itemSpacing: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  primaryAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
}

interface WithAutoLayout {
  layoutMode: AutoLayoutProps['layoutMode'];
  itemSpacing: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  primaryAxisAlignItems: AutoLayoutProps['primaryAxisAlignItems'];
}

interface WithInferredAutoLayout {
  inferredAutoLayout: AutoLayoutProps | null;
}

function hasLayoutMode(node: SceneNode): node is SceneNode & WithAutoLayout {
  return 'layoutMode' in node;
}

function hasInferredAutoLayout(node: SceneNode): node is SceneNode & WithInferredAutoLayout {
  return 'inferredAutoLayout' in node;
}

function getAutoLayout(node: SceneNode): AutoLayoutSnapshot | undefined {
  if (hasInferredAutoLayout(node) && node.inferredAutoLayout != null) {
    const al = node.inferredAutoLayout;
    return {
      layoutMode: al.layoutMode,
      itemSpacing: al.itemSpacing,
      paddingTop: al.paddingTop,
      paddingBottom: al.paddingBottom,
      paddingLeft: al.paddingLeft,
      paddingRight: al.paddingRight,
      primaryAxisAlignItems: al.primaryAxisAlignItems,
    };
  }

  if (hasLayoutMode(node)) {
    return {
      layoutMode: node.layoutMode,
      itemSpacing: node.itemSpacing,
      paddingTop: node.paddingTop,
      paddingBottom: node.paddingBottom,
      paddingLeft: node.paddingLeft,
      paddingRight: node.paddingRight,
      primaryAxisAlignItems: node.primaryAxisAlignItems,
    };
  }

  return undefined;
}

export function takeSnapshot(node: SceneNode): NodeSnapshot {
  const layout = hasLayout(node)
    ? { x: node.x, y: node.y, width: node.width, height: node.height }
    : { x: 0, y: 0, width: 0, height: 0 };

  const fills: SerializablePaint[] = hasFills(node) && node.fills !== figma.mixed
    ? [...node.fills].map(serializePaint)
    : [];

  const strokes: SerializablePaint[] = hasFills(node)
    ? [...node.strokes].map(serializePaint)
    : [];

  const effects: SerializableEffect[] = hasEffects(node)
    ? [...node.effects].map(serializeEffect)
    : [];

  const opacity = hasOpacity(node) ? node.opacity : 1;
  const visible = hasVisible(node) ? node.visible : true;

  const snapshot: NodeSnapshot = {
    id: node.id,
    name: node.name,
    type: node.type,
    ...layout,
    fills,
    strokes,
    effects,
    opacity,
    visible,
    children: [],
  };

  const autoLayout = getAutoLayout(node);
  if (autoLayout !== undefined) {
    snapshot.autoLayout = autoLayout;
  }

  if (node.type === 'TEXT') {
    snapshot.characters = node.characters;
    snapshot.fontSize = node.fontSize !== figma.mixed ? node.fontSize : undefined;
  }

  if (node.type === 'INSTANCE') {
    snapshot.componentId = node.mainComponent?.id;
  }

  if (hasChildren(node)) {
    snapshot.children = node.children.map(takeSnapshot);
  }

  return snapshot;
}
