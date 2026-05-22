import type { DiffResult, Severity } from '../shared/types';

interface DiffSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

interface DiffExportPayload {
  frameName: string;
  exportedAt: string;
  summary: DiffSummary;
  diffs: DiffResult[];
}

function countBySeverity(diffs: DiffResult[], severity: Severity): number {
  return diffs.filter((d) => d.severity === severity).length;
}

export function exportDiffAsJSON(diffs: DiffResult[], frameName: string): string {
  const payload: DiffExportPayload = {
    frameName,
    exportedAt: new Date().toISOString(),
    summary: {
      total: diffs.length,
      high: countBySeverity(diffs, 'high'),
      medium: countBySeverity(diffs, 'medium'),
      low: countBySeverity(diffs, 'low'),
    },
    diffs,
  };

  return JSON.stringify(payload, null, 2);
}

export function buildExportFileName(frameName: string): string {
  const date = new Date().toISOString().split('T')[0];
  const safe = frameName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `handoff-diff-${safe}-${date}.json`;
}
