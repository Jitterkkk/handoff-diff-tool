/// <reference types="@figma/plugin-typings" />

import type { SnapshotRecord } from '../shared/types';

const PREFIX = 'handoff:snapshot:';

export async function saveSnapshot(record: SnapshotRecord): Promise<void> {
  await figma.clientStorage.setAsync(`${PREFIX}${record.frameId}`, record);
}

export async function loadSnapshot(frameId: string): Promise<SnapshotRecord | null> {
  const value: unknown = await figma.clientStorage.getAsync(`${PREFIX}${frameId}`);
  return value != null ? (value as SnapshotRecord) : null;
}
