/// <reference types="@figma/plugin-typings" />

import LZString from 'lz-string';
import type { SnapshotRecord } from '../shared/types';

const PREFIX = 'handoff:snapshot:';
const MAX_COMPRESSED_CHARS = 900 * 1024; // margem antes do limite de 1MB do clientStorage

export async function saveSnapshot(record: SnapshotRecord): Promise<void> {
  const json = JSON.stringify(record);
  const compressed = LZString.compressToBase64(json);

  if (compressed.length > MAX_COMPRESSED_CHARS) {
    throw new Error(
      'Frame muito complexo para salvar. Tente selecionar um frame com menos layers.',
    );
  }

  await figma.clientStorage.setAsync(`${PREFIX}${record.frameId}`, compressed);
}

export async function loadSnapshot(frameId: string): Promise<SnapshotRecord | null> {
  const value: unknown = await figma.clientStorage.getAsync(`${PREFIX}${frameId}`);

  if (value == null) return null;

  // Compatibilidade com snapshots salvos antes da compressão (objeto direto)
  if (typeof value !== 'string') return value as SnapshotRecord;

  const json = LZString.decompressFromBase64(value);
  if (json == null) return null;

  return JSON.parse(json) as SnapshotRecord;
}
