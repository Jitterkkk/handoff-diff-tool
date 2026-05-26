/// <reference types="@figma/plugin-typings" />

import { takeSnapshot } from './snapshot';
import { diffSnapshots } from './diff';
import { saveToHistory, loadHistory, toMetaEntries, loadSettings, saveSettings } from './storage';
import { exportDiffAsJSON, buildExportFileName } from './export';
import { createHighlight, clearHighlights } from './highlight';
import { generateHTMLReport, buildReportFileName } from './reportGenerator';
import type {
  FrameDiffGroup,
  FrameMeta,
  PluginToUIMessage,
  UIToPluginMessage,
} from '../shared/types';

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

// ─── session state (in-memory, lives while plugin is open) ───────────────────

let sessionStart = 0;
const baselinePngs = new Map<string, string>(); // frameId → base64 PNG
const capturingFrameIds = new Set<string>(); // frames with baseline capture in progress

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function exportFramePng(frame: FrameNode): Promise<string | null> {
  try {
    const bytes = await frame.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1 },
    });
    return uint8ToBase64(bytes);
  } catch {
    return null;
  }
}

async function exportNodePng(node: SceneNode): Promise<string | null> {
  try {
    const bytes = await (node as FrameNode).exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1 },
    });
    return uint8ToBase64(bytes);
  } catch {
    return null;
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function buildFrameMeta(frame: FrameNode): Promise<FrameMeta> {
  const history = await loadHistory(frame.id);
  return { id: frame.id, name: frame.name, historyEntries: toMetaEntries(history) };
}

async function captureBaselines(frames: FrameNode[]): Promise<void> {
  if (sessionStart === 0) sessionStart = Date.now();
  await Promise.all(
    frames.map(async (frame) => {
      capturingFrameIds.add(frame.id);
      const snapshot = takeSnapshot(frame);
      await saveToHistory(frame.id, frame.name, snapshot);
      capturingFrameIds.delete(frame.id);
      // PNG export is fire-and-forget so it doesn't block the UI update
      void exportFramePng(frame).then(png => {
        if (png) baselinePngs.set(frame.id, png);
      });
    }),
  );
}

// Captures baseline only for frames that don't have history yet (idempotent)
async function ensureBaselines(frames: FrameNode[]): Promise<void> {
  const candidates = frames.filter(f => !capturingFrameIds.has(f.id));
  const toCapture: FrameNode[] = [];
  for (const frame of candidates) {
    const history = await loadHistory(frame.id);
    if (!history || history.entries.length === 0) toCapture.push(frame);
  }
  if (toCapture.length > 0) await captureBaselines(toCapture);
}

async function notifyCurrentFrames(withBaseline = false): Promise<void> {
  const frames = getSelectedFrames();
  if (frames.length === 0) {
    send({ type: 'NO_FRAME_SELECTED' });
    return;
  }
  if (withBaseline) await ensureBaselines(frames);
  const metas = await Promise.all(frames.map(buildFrameMeta));
  send({ type: 'CURRENT_FRAMES', frames: metas, sessionStart });
}

// ─── message handler ─────────────────────────────────────────────────────────

figma.ui.onmessage = async (raw: unknown): Promise<void> => {
  const msg = raw as UIToPluginMessage;

  switch (msg.type) {
    case 'GET_CURRENT_FRAME': {
      await notifyCurrentFrames(true);
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

    case 'GENERATE_REPORT': {
      try {
        const frames = getSelectedFrames();
        if (frames.length === 0) {
          send({ type: 'ERROR', message: 'Selecione ao menos um frame para gerar o relatório.' });
          break;
        }

        const isMulti = frames.length > 1;
        const reportFrames = [];
        let anyHadHistory = false;

        for (const frame of frames) {
          const history = await loadHistory(frame.id);
          if (!history || history.entries.length === 0) continue;
          anyHadHistory = true;

          const idx = isMulti
            ? history.entries.length - 1
            : Math.min(msg.entryIndex, history.entries.length - 1);
          const entry = history.entries[idx];

          const finalSnapshot = takeSnapshot(frame);
          const diffs = diffSnapshots(entry.snapshot, finalSnapshot, {
            includePosition: msg.includePosition,
          });

          // Export final frame PNG
          const afterPng = await exportFramePng(frame);

          // Export node PNGs in parallel, capped at 20 to avoid timeout
          const nodePngs: Record<string, string> = {};
          const nodeTypes: Record<string, string> = {};
          const exportableDiffs = diffs
            .filter(d => d.type !== 'REMOVED')
            .slice(0, 20);

          await Promise.all(exportableDiffs.map(async (diff) => {
            const node = figma.getNodeById(diff.nodeId);
            if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
              nodeTypes[diff.nodeId] = node.type;
              const png = await exportNodePng(node as SceneNode);
              if (png) nodePngs[diff.nodeId] = png;
            }
          }));

          reportFrames.push({
            group: {
              frameId: frame.id,
              frameName: frame.name,
              diffs,
              savedAt: entry.savedAt,
            },
            beforePng: baselinePngs.get(frame.id) ?? null,
            afterPng,
            nodePngs,
            nodeTypes,
          });
        }

        if (!anyHadHistory) {
          send({ type: 'NO_PREVIOUS_SNAPSHOT' });
          break;
        }

        const designerName = figma.currentUser !== null ? figma.currentUser.name : 'Designer';
        const html = generateHTMLReport({
          designerName,
          sessionStart: sessionStart || Date.now(),
          reportAt: Date.now(),
          frames: reportFrames,
        });
        const fileName = buildReportFileName(reportFrames.map(f => ({ frameName: f.group.frameName })));
        send({ type: 'REPORT_READY', html, fileName });
      } catch (err) {
        send({ type: 'ERROR', message: 'Erro ao gerar relatório: ' + String(err) });
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

figma.on('selectionchange', () => { void notifyCurrentFrames(true); });
