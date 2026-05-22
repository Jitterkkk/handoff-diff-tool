/// <reference types="@figma/plugin-typings" />

import { takeSnapshot } from './snapshot';
import { diffSnapshots } from './diff';
import { saveToHistory, loadHistory, toMetaEntries, loadSettings, saveSettings } from './storage';
import { exportDiffAsJSON, buildExportFileName } from './export';
import { createHighlight, clearHighlights } from './highlight';
import type { FrameDiffGroup, FrameMeta, PluginToUIMessage, UIToPluginMessage } from '../shared/types';

figma.showUI(__html__, {
  width: 380,
  height: 560,
  title: 'Handoff Diff Tool',
});

function send(msg: PluginToUIMessage): void {
  figma.ui.postMessage(msg);
}

function getSelectedFrames(): FrameNode[] {
  return figma.currentPage.selection.filter(
    (n): n is FrameNode => n.type === 'FRAME',
  );
}

async function buildFrameMeta(frame: FrameNode): Promise<FrameMeta> {
  const history = await loadHistory(frame.id);
  return { id: frame.id, name: frame.name, historyEntries: toMetaEntries(history) };
}

async function notifyCurrentFrames(): Promise<void> {
  const frames = getSelectedFrames();
  if (frames.length === 0) {
    send({ type: 'NO_FRAME_SELECTED' });
    return;
  }
  const metas = await Promise.all(frames.map(buildFrameMeta));
  send({ type: 'CURRENT_FRAMES', frames: metas });
}

figma.ui.onmessage = async (raw: unknown): Promise<void> => {
  const msg = raw as UIToPluginMessage;

  switch (msg.type) {
    case 'GET_CURRENT_FRAME': {
      await notifyCurrentFrames();
      break;
    }

    case 'SAVE_SNAPSHOT': {
      const frames = getSelectedFrames();
      if (frames.length === 0) {
        send({ type: 'ERROR', message: 'Selecione ao menos um frame antes de salvar.' });
        break;
      }
      try {
        const metas = await Promise.all(
          frames.map(async (frame) => {
            const snapshot = takeSnapshot(frame);
            const history = await saveToHistory(frame.id, frame.name, snapshot, msg.label);
            return { id: frame.id, name: frame.name, historyEntries: toMetaEntries(history) };
          }),
        );
        send({ type: 'SNAPSHOT_SAVED', frames: metas });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro desconhecido ao salvar snapshot.';
        send({ type: 'ERROR', message });
      }
      break;
    }

    case 'GET_DIFF': {
      const frames = getSelectedFrames();
      if (frames.length === 0) {
        send({ type: 'ERROR', message: 'Selecione ao menos um frame para comparar.' });
        break;
      }

      const isMulti = frames.length > 1;
      const frameDiffs: FrameDiffGroup[] = [];
      let anyHadHistory = false;

      for (const frame of frames) {
        const history = await loadHistory(frame.id);
        if (!history || history.entries.length === 0) continue;
        anyHadHistory = true;
        // multi-frame: sempre mais recente; single-frame: respeita entryIndex do seletor
        const idx = isMulti
          ? history.entries.length - 1
          : Math.min(msg.entryIndex, history.entries.length - 1);
        const entry = history.entries[idx];
        const current = takeSnapshot(frame);
        const diffs = diffSnapshots(entry.snapshot, current, {
          includePosition: msg.includePosition,
        });
        frameDiffs.push({ frameId: frame.id, frameName: frame.name, diffs, savedAt: entry.savedAt });
      }

      if (!anyHadHistory) {
        send({ type: 'NO_PREVIOUS_SNAPSHOT' });
      } else {
        send({ type: 'DIFF_RESULT', frameDiffs });
      }
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
      const json = exportDiffAsJSON(msg.frameDiffs);
      const fileName = buildExportFileName(msg.frameDiffs);
      send({ type: 'DIFF_EXPORT', json, fileName });
      break;
    }
  }
};

figma.on('selectionchange', () => { void notifyCurrentFrames(); });
