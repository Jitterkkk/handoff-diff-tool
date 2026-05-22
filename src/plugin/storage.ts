/// <reference types="@figma/plugin-typings" />

import LZString from 'lz-string';
import type { NodeSnapshot, SnapshotHistory, SnapshotEntryMeta } from '../shared/types';

const HISTORY_PREFIX = 'handoff:history:';
const MAX_ENTRIES = 5;
const MAX_COMPRESSED_CHARS = 900 * 1024;

export async function saveToHistory(
  frameId: string,
  frameName: string,
  snapshot: NodeSnapshot,
  label?: string,
): Promise<SnapshotHistory> {
  const existing = await loadHistory(frameId);

  const newEntry = { savedAt: Date.now(), snapshot, ...(label ? { label } : {}) };
  const entries = [...(existing?.entries ?? []), newEntry].slice(-MAX_ENTRIES);
  const history: SnapshotHistory = { frameId, frameName, entries };

  const compressed = LZString.compressToBase64(JSON.stringify(history));
  if (compressed.length > MAX_COMPRESSED_CHARS) {
    throw new Error(
      'Frame muito complexo para salvar. Tente selecionar um frame com menos layers.',
    );
  }

  await figma.clientStorage.setAsync(`${HISTORY_PREFIX}${frameId}`, compressed);
  return history;
}

export async function loadHistory(frameId: string): Promise<SnapshotHistory | null> {
  const value: unknown = await figma.clientStorage.getAsync(`${HISTORY_PREFIX}${frameId}`);

  if (value == null) return null;
  if (typeof value !== 'string') return value as SnapshotHistory;

  const json = LZString.decompressFromBase64(value);
  if (json == null) return null;

  return JSON.parse(json) as SnapshotHistory;
}

export function toMetaEntries(history: SnapshotHistory | null): SnapshotEntryMeta[] {
  if (!history) return [];
  return history.entries.map((e, i) => ({
    index: i,
    savedAt: e.savedAt,
    ...(e.label ? { label: e.label } : {}),
  }));
}
