import type { DiffResult, FrameDiffGroup, Severity } from '../shared/types';

function countBySeverity(diffs: DiffResult[], severity: Severity): number {
  return diffs.filter((d) => d.severity === severity).length;
}

function summarize(diffs: DiffResult[]) {
  return {
    total: diffs.length,
    high: countBySeverity(diffs, 'high'),
    medium: countBySeverity(diffs, 'medium'),
    low: countBySeverity(diffs, 'low'),
  };
}

export function exportDiffAsJSON(frameDiffs: FrameDiffGroup[]): string {
  const exportedAt = new Date().toISOString();

  if (frameDiffs.length === 1) {
    const g = frameDiffs[0];
    return JSON.stringify(
      { frameName: g.frameName, exportedAt, summary: summarize(g.diffs), diffs: g.diffs },
      null,
      2,
    );
  }

  return JSON.stringify(
    {
      exportedAt,
      frames: frameDiffs.map((g) => ({
        frameId: g.frameId,
        frameName: g.frameName,
        savedAt: new Date(g.savedAt).toISOString(),
        summary: summarize(g.diffs),
        diffs: g.diffs,
      })),
    },
    null,
    2,
  );
}

export function buildExportFileName(frameDiffs: FrameDiffGroup[]): string {
  const date = new Date().toISOString().split('T')[0];
  if (frameDiffs.length === 1) {
    const safe = frameDiffs[0].frameName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `handoff-diff-${safe}-${date}.json`;
  }
  return `handoff-diff-multi-${frameDiffs.length}-frames-${date}.json`;
}
