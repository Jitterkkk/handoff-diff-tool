import type { AutoLayoutSnapshot, DiffResult, RGBA, SerializablePaint } from '../shared/types';

function rgbaToHex(rgba: RGBA): string {
  const r = Math.round(rgba.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(rgba.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(rgba.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

function rgbaToCSS(rgba: RGBA, opacity: number): string {
  const alpha = rgba.a * opacity;
  if (alpha >= 0.99) return rgbaToHex(rgba);
  const r = Math.round(rgba.r * 255);
  const g = Math.round(rgba.g * 255);
  const b = Math.round(rgba.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

function nameToSelector(nodeName: string): string {
  return `.${nodeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

function firstSolid(
  paints: SerializablePaint[],
): { color: RGBA; opacity: number } | null {
  for (const p of paints) {
    if (p.type === 'SOLID' && p.visible && 'color' in p) {
      return { color: p.color, opacity: p.opacity };
    }
  }
  return null;
}

function paddingShorthand(layout: AutoLayoutSnapshot): string {
  const { paddingTop: t, paddingRight: r, paddingBottom: b, paddingLeft: l } = layout;
  if (t === r && r === b && b === l) return `${t}px`;
  if (t === b && r === l) return `${t}px ${r}px`;
  return `${t}px ${r}px ${b}px ${l}px`;
}

export interface CSSBlock {
  selector: string;
  declarations: string[];
}

export function generateCSS(diff: DiffResult, nodeType?: string): CSSBlock | null {
  const sel = nameToSelector(diff.nodeName);

  switch (diff.type) {
    case 'COLOR': {
      const after = diff.after as SerializablePaint[];
      const before = diff.before as SerializablePaint[];
      const solidAfter = firstSolid(after);
      const solidBefore = firstSolid(before);
      if (!solidAfter) return null;

      const colorAfter = rgbaToCSS(solidAfter.color, solidAfter.opacity);
      const colorBefore = solidBefore ? rgbaToCSS(solidBefore.color, solidBefore.opacity) : '—';
      const property = nodeType === 'TEXT' ? 'color' : 'background-color';

      return {
        selector: sel,
        declarations: [
          `/* era ${colorBefore} */`,
          `${property}: ${colorAfter};`,
        ],
      };
    }

    case 'SIZE': {
      const b = diff.before as { width: number; height: number };
      const a = diff.after as { width: number; height: number };
      const declarations: string[] = [];
      if (b.width !== a.width) declarations.push(`width: ${a.width}px; /* era ${b.width}px */`);
      if (b.height !== a.height) declarations.push(`height: ${a.height}px; /* era ${b.height}px */`);
      if (!declarations.length) return null;
      return { selector: sel, declarations };
    }

    case 'TYPOGRAPHY': {
      const before = diff.before as number;
      const after = diff.after as number;
      return {
        selector: sel,
        declarations: [`font-size: ${after}px; /* era ${before}px */`],
      };
    }

    case 'LAYOUT': {
      const layout = diff.after as AutoLayoutSnapshot;
      if (!layout || layout.layoutMode === 'NONE') return null;
      const declarations = [
        'display: flex;',
        `flex-direction: ${layout.layoutMode === 'HORIZONTAL' ? 'row' : 'column'};`,
      ];
      if (layout.itemSpacing > 0) declarations.push(`gap: ${layout.itemSpacing}px;`);
      const pad = paddingShorthand(layout);
      if (pad !== '0px') declarations.push(`padding: ${pad};`);
      return { selector: sel, declarations };
    }

    case 'POSITION': {
      const b = diff.before as { x: number; y: number };
      const a = diff.after as { x: number; y: number };
      const declarations: string[] = [];
      if (b.x !== a.x) declarations.push(`left: ${a.x}px; /* era ${b.x}px */`);
      if (b.y !== a.y) declarations.push(`top: ${a.y}px; /* era ${b.y}px */`);
      return { selector: sel, declarations };
    }

    case 'CONTENT': {
      // visibility or opacity
      if (typeof diff.after === 'boolean') {
        return {
          selector: sel,
          declarations: [`visibility: ${diff.after ? 'visible' : 'hidden'};`],
        };
      }
      if (typeof diff.after === 'number') {
        return {
          selector: sel,
          declarations: [`opacity: ${(diff.after as number).toFixed(2)}; /* era ${(diff.before as number).toFixed(2)} */`],
        };
      }
      return null;
    }

    default:
      return null;
  }
}

export function cssBlockToString(block: CSSBlock): string {
  const indent = '  ';
  const body = block.declarations.map((d) => `${indent}${d}`).join('\n');
  return `${block.selector} {\n${body}\n}`;
}
