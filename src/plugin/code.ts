/// <reference types="@figma/plugin-typings" />

import { takeSnapshot } from './snapshot';
import { diffSnapshots } from './diff';
import { saveToHistory, loadHistory, toMetaEntries, loadSettings, saveSettings } from './storage';
import { exportDiffAsJSON, buildExportFileName } from './export';
import { createHighlight, clearHighlights } from './highlight';
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
    const history = await loadHistory(frame.id);
    const historyEntries = toMetaEntries(history);
    send({
      type: 'CURRENT_FRAME',
      frameId: frame.id,
      frameName: frame.name,
      hasSnapshot: historyEntries.length > 0,
      historyEntries,
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
        const history = await saveToHistory(frame.id, frame.name, snapshot, msg.label);
        const historyEntries = toMetaEntries(history);
        send({
          type: 'SNAPSHOT_SAVED',
          frameId: frame.id,
          frameName: frame.name,
          savedAt: historyEntries[historyEntries.length - 1].savedAt,
          historyEntries,
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
      const history = await loadHistory(frame.id);
      if (!history || history.entries.length === 0) {
        send({ type: 'NO_PREVIOUS_SNAPSHOT' });
        break;
      }
      const safeIndex = Math.min(msg.entryIndex, history.entries.length - 1);
      const entry = history.entries[safeIndex];
      const current = takeSnapshot(frame);
      const diffs = diffSnapshots(entry.snapshot, current, { includePosition: msg.includePosition });
      send({ type: 'DIFF_RESULT', diffs, frameId: frame.id, savedAt: entry.savedAt });
      break;
    }

    case 'ZOOM_TO_NODE': {
      const node = figma.getNodeById(msg.nodeId);
      if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
        const sceneNode = node as SceneNode;
        figma.viewport.scrollAndZoomIntoView([sceneNode]);
        createHighlight(sceneNode);
      }
      break;
    }

    case 'CLEAR_HIGHLIGHTS': {
      clearHighlights();
      break;
    }

    case 'GET_SETTINGS': {
      const settings = await loadSettings();
      send({ type: 'SETTINGS', includePosition: settings.includePosition });
      break;
    }

    case 'SAVE_SETTINGS': {
      await saveSettings({ includePosition: msg.includePosition });
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
