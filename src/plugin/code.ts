/// <reference types="@figma/plugin-typings" />

import { takeSnapshot } from './snapshot';
import { diffSnapshots } from './diff';
import { saveSnapshot, loadSnapshot } from './storage';
import { exportDiffAsJSON, buildExportFileName } from './export';
import type { PluginToUIMessage, UIToPluginMessage } from '../shared/types';

figma.showUI(__html__, {
  width: 380,
  height: 560,
  title: 'Handoff Diff Tool',
});

function send(msg: PluginToUIMessage): void {
  figma.ui.postMessage(msg);
}

function getSelectedFrame(): FrameNode | null {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) return null;
  const node = selection[0];
  return node.type === 'FRAME' ? node : null;
}

async function notifyCurrentFrame(): Promise<void> {
  const frame = getSelectedFrame();
  if (frame) {
    const record = await loadSnapshot(frame.id);
    send({
      type: 'CURRENT_FRAME',
      frameId: frame.id,
      frameName: frame.name,
      hasSnapshot: record !== null,
      snapshotSavedAt: record?.savedAt ?? null,
    });
  } else {
    send({ type: 'NO_FRAME_SELECTED' });
  }
}

figma.ui.onmessage = async (raw: unknown): Promise<void> => {
  const msg = raw as UIToPluginMessage;

  switch (msg.type) {
    case 'GET_CURRENT_FRAME': {
      await notifyCurrentFrame();
      break;
    }

    case 'SAVE_SNAPSHOT': {
      const frame = getSelectedFrame();
      if (!frame) {
        send({ type: 'ERROR', message: 'Selecione um frame antes de salvar.' });
        break;
      }
      try {
        const snapshot = takeSnapshot(frame);
        const record = {
          frameId: frame.id,
          frameName: frame.name,
          snapshot,
          savedAt: Date.now(),
        };
        await saveSnapshot(record);
        send({
          type: 'SNAPSHOT_SAVED',
          frameId: frame.id,
          frameName: frame.name,
          savedAt: record.savedAt,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro desconhecido ao salvar snapshot.';
        send({ type: 'ERROR', message });
      }
      break;
    }

    case 'GET_DIFF': {
      const frame = getSelectedFrame();
      if (!frame) {
        send({ type: 'ERROR', message: 'Selecione um frame para comparar.' });
        break;
      }
      const record = await loadSnapshot(frame.id);
      if (!record) {
        send({ type: 'NO_PREVIOUS_SNAPSHOT' });
        break;
      }
      const current = takeSnapshot(frame);
      const diffs = diffSnapshots(record.snapshot, current);
      send({ type: 'DIFF_RESULT', diffs, frameId: frame.id, savedAt: record.savedAt });
      break;
    }

    case 'ZOOM_TO_NODE': {
      const node = figma.getNodeById(msg.nodeId);
      if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
      break;
    }

    case 'EXPORT_DIFF': {
      const json = exportDiffAsJSON(msg.diffs, msg.frameName);
      const fileName = buildExportFileName(msg.frameName);
      send({ type: 'DIFF_EXPORT', json, fileName });
      break;
    }
  }
};

figma.on('selectionchange', () => { void notifyCurrentFrame(); });
