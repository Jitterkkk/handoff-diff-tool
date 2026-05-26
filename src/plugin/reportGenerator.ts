import type { DiffResult, DiffType, FrameDiffGroup, Severity } from '../shared/types';
import { generateCSS, cssBlockToString } from './cssGenerator';

export interface FrameReportData {
  group: FrameDiffGroup;
  beforePng: string | null;   // base64
  afterPng: string | null;    // base64
  nodePngs: Record<string, string>; // nodeId → base64
  nodeTypes: Record<string, string>; // nodeId → figma node type
}

export interface ReportData {
  designerName: string;
  sessionStart: number;
  reportAt: number;
  frames: FrameReportData[];
}

// ─── helpers ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<DiffType, string> = {
  COLOR: 'Cor',
  SIZE: 'Tamanho',
  TYPOGRAPHY: 'Tipografia',
  CONTENT: 'Conteúdo',
  ADDED: 'Adicionado',
  REMOVED: 'Removido',
  COMPONENT: 'Componente',
  LAYOUT: 'Layout',
  POSITION: 'Posição',
};

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string }> = {
  high:   { bg: '#fdecea', text: '#c62828' },
  medium: { bg: '#fff3e0', text: '#e65100' },
  low:    { bg: '#f3f3f3', text: '#555555' },
};

const SEVERITY_LABELS: Record<Severity, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function valueLabel(diff: DiffResult): { before: string; after: string } {
  switch (diff.type) {
    case 'COLOR': {
      function paintSwatch(paints: unknown): string {
        if (!Array.isArray(paints)) return '—';
        for (const p of paints as Array<Record<string, unknown>>) {
          if (p.type === 'SOLID' && p.visible && p.color) {
            const c = p.color as { r: number; g: number; b: number };
            const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
            const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
            const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
            const hex = `#${r}${g}${b}`.toUpperCase();
            return `<span class="swatch" style="background:${hex}"></span><code>${hex}</code>`;
          }
        }
        return '—';
      }
      return { before: paintSwatch(diff.before), after: paintSwatch(diff.after) };
    }
    case 'SIZE': {
      const b = diff.before as { width: number; height: number };
      const a = diff.after as { width: number; height: number };
      return {
        before: `<code>${b.width}×${b.height}px</code>`,
        after:  `<code>${a.width}×${a.height}px</code>`,
      };
    }
    case 'TYPOGRAPHY':
      return {
        before: `<code>${diff.before as number}px</code>`,
        after:  `<code>${diff.after as number}px</code>`,
      };
    case 'CONTENT':
      return {
        before: `<code>${esc(String(diff.before))}</code>`,
        after:  `<code>${esc(String(diff.after))}</code>`,
      };
    case 'ADDED':
      return { before: '—', after: '<span class="tag-added">adicionado</span>' };
    case 'REMOVED':
      return { before: '<span class="tag-removed">removido</span>', after: '—' };
    case 'COMPONENT':
      return {
        before: `<code class="small">${esc(String(diff.before ?? '—'))}</code>`,
        after:  `<code class="small">${esc(String(diff.after  ?? '—'))}</code>`,
      };
    case 'LAYOUT': {
      function layoutLabel(v: unknown): string {
        if (!v) return '—';
        const l = v as { layoutMode: string; itemSpacing: number };
        return `<code>${l.layoutMode} / gap ${l.itemSpacing}px</code>`;
      }
      return { before: layoutLabel(diff.before), after: layoutLabel(diff.after) };
    }
    case 'POSITION': {
      const b = diff.before as { x: number; y: number };
      const a = diff.after as { x: number; y: number };
      return {
        before: `<code>${b.x}, ${b.y}</code>`,
        after:  `<code>${a.x}, ${a.y}</code>`,
      };
    }
    default:
      return { before: '—', after: '—' };
  }
}

function img(base64: string | null, alt: string, cls = ''): string {
  if (!base64) return `<div class="img-missing">${esc(alt)}</div>`;
  return `<img src="data:image/png;base64,${base64}" alt="${esc(alt)}" class="${cls}" />`;
}

// ─── HTML sections ───────────────────────────────────────────────────────────

function renderFrameSection(data: FrameReportData, frameIndex: number, isMulti: boolean): string {
  const { group, beforePng, afterPng, nodePngs, nodeTypes } = data;
  const totalDiffs = group.diffs.length;

  const header = isMulti
    ? `<h2 class="frame-title">Frame: ${esc(group.frameName)}</h2>`
    : '';

  const screenshotsSection = (beforePng || afterPng)
    ? `<div class="screenshots-grid">
        <div class="screenshot-col">
          <div class="screenshot-label before-label">Antes</div>
          ${img(beforePng, 'Estado inicial', 'frame-img')}
        </div>
        <div class="screenshot-col">
          <div class="screenshot-label after-label">Depois</div>
          ${img(afterPng, 'Estado final', 'frame-img')}
        </div>
      </div>`
    : '';

  if (totalDiffs === 0) {
    return `${header}${screenshotsSection}
    <div class="no-changes">✓ Nenhuma diferença encontrada neste frame.</div>`;
  }

  const rows = group.diffs.map((diff, i) => {
    const sev = SEVERITY_COLORS[diff.severity];
    const { before, after } = valueLabel(diff);
    const cssBlock = generateCSS(diff, nodeTypes[diff.nodeId]);
    const cssStr = cssBlock ? cssBlockToString(cssBlock) : null;
    const nodePng = nodePngs[diff.nodeId];

    return `<div class="change-card" id="change-${frameIndex}-${i}">
      <div class="change-header">
        <span class="change-number">#${i + 1}</span>
        <span class="badge" style="background:${sev.bg};color:${sev.text}">
          ${TYPE_LABELS[diff.type]}
        </span>
        <span class="severity-badge">${SEVERITY_LABELS[diff.severity]}</span>
        <span class="node-name">${esc(diff.nodeName)}</span>
      </div>
      <div class="change-body">
        <div class="values-row">
          <div class="value-col">
            <div class="value-label">Antes</div>
            <div class="value-content">${before}</div>
          </div>
          <div class="arrow">→</div>
          <div class="value-col">
            <div class="value-label">Depois</div>
            <div class="value-content">${after}</div>
          </div>
          ${nodePng ? `<div class="value-col">
            <div class="value-label">Visual (depois)</div>
            ${img(nodePng, diff.nodeName, 'node-img')}
          </div>` : ''}
        </div>
        ${cssStr ? `<details class="css-block">
          <summary>CSS sugerido</summary>
          <pre><code>${esc(cssStr)}</code></pre>
        </details>` : ''}
      </div>
    </div>`;
  }).join('\n');

  return `${header}${screenshotsSection}
  <div class="summary-bar">
    ${totalDiffs} ${totalDiffs === 1 ? 'mudança' : 'mudanças'} —
    ${group.diffs.filter(d => d.severity === 'high').length} alta ·
    ${group.diffs.filter(d => d.severity === 'medium').length} média ·
    ${group.diffs.filter(d => d.severity === 'low').length} baixa
  </div>
  <div class="changes-list">${rows}</div>`;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const STYLES = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
       font-size: 14px; color: #1e1e1e; background: #f7f7f7; }
a { color: #18a0fb; }
code { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px;
       background: #f0f0f0; padding: 1px 5px; border-radius: 3px; }
code.small { font-size: 10px; }
pre { background: #1e1e1e; color: #d4d4d4; padding: 14px 16px;
      border-radius: 6px; overflow-x: auto; font-size: 12px; line-height: 1.6; }
pre code { background: none; padding: 0; color: inherit; }
details summary { cursor: pointer; font-size: 12px; font-weight: 600;
                  color: #555; padding: 6px 0; user-select: none; }
details[open] summary { color: #1e1e1e; }

/* Layout */
.page { max-width: 980px; margin: 0 auto; padding: 32px 24px 64px; }

/* Header */
.report-header { background: #1e1e1e; color: #fff; border-radius: 10px;
                 padding: 28px 32px; margin-bottom: 32px; }
.report-title { font-size: 22px; font-weight: 700; margin-bottom: 12px; }
.report-title span { color: #18a0fb; }
.meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
             gap: 12px; margin-top: 16px; }
.meta-item { background: rgba(255,255,255,0.07); border-radius: 6px; padding: 10px 14px; }
.meta-label { font-size: 10px; font-weight: 600; text-transform: uppercase;
              letter-spacing: .06em; color: #888; margin-bottom: 3px; }
.meta-value { font-size: 13px; font-weight: 500; }

/* Frame section */
.frame-title { font-size: 18px; font-weight: 700; margin: 32px 0 16px;
               padding-bottom: 8px; border-bottom: 2px solid #e0e0e0; }

/* Screenshots */
.screenshots-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
                    margin-bottom: 24px; }
.screenshot-col { display: flex; flex-direction: column; gap: 8px; }
.screenshot-label { font-size: 11px; font-weight: 700; text-transform: uppercase;
                    letter-spacing: .06em; padding: 4px 10px; border-radius: 4px; width: fit-content; }
.before-label { background: #fdecea; color: #c62828; }
.after-label  { background: #e8f5e9; color: #2e7d32; }
.frame-img    { width: 100%; border-radius: 8px; border: 1px solid #e0e0e0;
                box-shadow: 0 2px 8px rgba(0,0,0,.08); }
.img-missing  { background: #f5f5f5; border: 1px dashed #ccc; border-radius: 8px;
                padding: 24px; text-align: center; color: #aaa; font-size: 12px; }

/* Summary bar */
.summary-bar  { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px;
                padding: 12px 16px; font-size: 13px; color: #555;
                margin-bottom: 20px; }

/* No changes */
.no-changes { background: #e8f5e9; color: #2e7d32; border-radius: 8px;
              padding: 16px 20px; font-weight: 600; margin-bottom: 24px; }

/* Change cards */
.changes-list { display: flex; flex-direction: column; gap: 12px; }
.change-card  { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px;
                overflow: hidden; }
.change-header{ display: flex; align-items: center; gap: 10px; padding: 12px 16px;
                border-bottom: 1px solid #f0f0f0; flex-wrap: wrap; }
.change-number{ font-size: 11px; font-weight: 700; color: #aaa; min-width: 24px; }
.badge        { font-size: 10px; font-weight: 700; text-transform: uppercase;
                letter-spacing: .05em; padding: 3px 7px; border-radius: 4px; }
.severity-badge { font-size: 10px; color: #aaa; }
.node-name    { font-size: 12px; font-weight: 600; color: #333; margin-left: auto; }
.change-body  { padding: 14px 16px; }
.values-row   { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.value-col    { display: flex; flex-direction: column; gap: 4px; min-width: 80px; }
.value-label  { font-size: 10px; font-weight: 600; text-transform: uppercase;
                letter-spacing: .05em; color: #aaa; }
.value-content{ display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.arrow        { font-size: 18px; color: #ccc; padding-top: 18px; }
.node-img     { max-width: 160px; max-height: 120px; border-radius: 6px;
                border: 1px solid #e0e0e0; object-fit: contain; }
.swatch       { display: inline-block; width: 14px; height: 14px; border-radius: 3px;
                border: 1px solid rgba(0,0,0,.1); flex-shrink: 0; }
.css-block    { margin-top: 12px; }
.tag-added    { background: #e8f5e9; color: #2e7d32; padding: 2px 8px;
                border-radius: 4px; font-size: 11px; font-weight: 600; }
.tag-removed  { background: #fdecea; color: #c62828; padding: 2px 8px;
                border-radius: 4px; font-size: 11px; font-weight: 600; }

/* Separator between frames */
.frame-separator { border: none; border-top: 2px dashed #e0e0e0; margin: 40px 0; }

@media (max-width: 640px) {
  .screenshots-grid { grid-template-columns: 1fr; }
  .values-row { flex-direction: column; }
  .arrow { display: none; }
}
`;

// ─── main export ─────────────────────────────────────────────────────────────

export function generateHTMLReport(data: ReportData): string {
  const { designerName, sessionStart, reportAt, frames } = data;
  const isMulti = frames.length > 1;

  const totalChanges = frames.reduce((s, f) => s + f.group.diffs.length, 0);

  const frameSections = frames
    .map((f, i) => renderFrameSection(f, i, isMulti))
    .join('\n<hr class="frame-separator" />\n');

  const frameNames = isMulti
    ? frames.map(f => f.group.frameName).join(', ')
    : frames[0]?.group.frameName ?? '—';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Handoff Report — ${esc(frameNames)}</title>
  <style>${STYLES}</style>
</head>
<body>
<div class="page">

  <header class="report-header">
    <div class="report-title">
      Handoff Diff Report — <span>${esc(frameNames)}</span>
    </div>
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Designer</div>
        <div class="meta-value">${esc(designerName)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Sessão iniciada</div>
        <div class="meta-value">${formatDate(sessionStart)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Relatório gerado</div>
        <div class="meta-value">${formatDate(reportAt)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Total de mudanças</div>
        <div class="meta-value">${totalChanges} ${totalChanges === 1 ? 'mudança' : 'mudanças'}</div>
      </div>
    </div>
  </header>

  ${frameSections}

</div>
</body>
</html>`;
}

export function buildReportFileName(frames: { frameName: string }[]): string {
  const date = new Date().toISOString().split('T')[0];
  if (frames.length === 1) {
    const safe = frames[0].frameName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `handoff-report-${safe}-${date}.html`;
  }
  return `handoff-report-multi-${frames.length}-frames-${date}.html`;
}
