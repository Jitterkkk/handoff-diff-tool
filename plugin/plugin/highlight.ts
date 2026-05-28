/// <reference types="@figma/plugin-typings" />

const HIGHLIGHTS_FRAME_NAME = 'Handoff Highlights';
const STROKE_COLOR: RGB = { r: 1, g: 0.231, b: 0.188 }; // #FF3B30

function getOrCreateHighlightsFrame(): FrameNode {
  const existing = figma.currentPage.children.find(
    (n) => n.type === 'FRAME' && n.name === HIGHLIGHTS_FRAME_NAME,
  ) as FrameNode | undefined;

  if (existing) return existing;

  const frame = figma.createFrame();
  frame.name = HIGHLIGHTS_FRAME_NAME;
  frame.x = 0;
  frame.y = 0;
  frame.resize(1, 1);
  frame.fills = [];
  frame.clipsContent = false;
  frame.locked = true;
  return frame;
}

export function createHighlight(node: SceneNode): void {
  const bounds = (node as { absoluteBoundingBox?: Rect | null }).absoluteBoundingBox;
  if (!bounds) return;

  const frame = getOrCreateHighlightsFrame();
  const rect = figma.createRectangle();
  rect.name = `highlight:${node.id}`;
  rect.x = bounds.x - frame.x;
  rect.y = bounds.y - frame.y;
  rect.resize(bounds.width, bounds.height);
  rect.fills = [];
  rect.strokes = [{ type: 'SOLID', color: STROKE_COLOR }];
  rect.strokeWeight = 2;
  rect.strokeAlign = 'OUTSIDE';
  rect.opacity = 0.8;
  frame.appendChild(rect);
}

export function clearHighlights(): void {
  const frame = figma.currentPage.children.find(
    (n) => n.type === 'FRAME' && n.name === HIGHLIGHTS_FRAME_NAME,
  );
  if (frame) frame.remove();
}
