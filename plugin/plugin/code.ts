/// <reference types="@figma/plugin-typings" />

import { takeSnapshot } from './snapshot';
import { diffSnapshots } from './diff';
import { saveToHistory, loadHistory, toMetaEntries, loadSettings, saveSettings, saveReview, saveAuthToken, loadAuthToken } from './storage';
import { createHighlight, clearHighlights } from './highlight';
import { refreshBadge } from './badge';
import { apiClient } from './api';
import type {
  FrameMeta,
  FrameReview,
  PluginToUIMessage,
  UIToPluginMessage,
} from '../shared/types';

function send(msg: PluginToUIMessage): void {
  figma.ui.postMessage(msg);
}

function getSelectedFrames(): FrameNode[] {
  return figma.currentPage.selection.filter(
    (n): n is FrameNode => n.type === 'FRAME',
  );
}

// ─── Auth state ───────────────────────────────────────────────────────────────

let authToken: string | null = null;

async function authenticateUser(): Promise<string | null> {
  try {
    const stored = await loadAuthToken();
    if (stored) return stored;

    if (figma.currentUser === null) return null;

    const token = await apiClient.authenticate({
      figmaUserId: figma.currentUser.id ?? figma.currentUser.name,
      name: figma.currentUser.name,
      avatarUrl: figma.currentUser.photoUrl ?? undefined,
    });
    await saveAuthToken(token);
    return token;
  } catch (err) {
    console.error('[handoff] auth failed:', String(err));
    return null;
  }
}

// ─── Session state ────────────────────────────────────────────────────────────

let sessionStart = 0;
const capturingFrameIds = new Set<string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    }),
  );
}

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
  void Promise.all(frames.map(f => refreshBadge(f.id)));
}

// ─── Init ─────────────────────────────────────────────────────────────────────

void (async () => {
  authToken = await authenticateUser();

  figma.showUI(__html__, {
    width: 320,
    height: 420,
    title: 'Handoff',
  });

  send({
    type: 'AUTH_STATUS',
    authenticated: authToken !== null,
    userName: figma.currentUser !== null ? figma.currentUser.name : null,
  });
})();

// ─── Message handler ──────────────────────────────────────────────────────────

figma.ui.onmessage = async (raw: unknown): Promise<void> => {
  const msg = raw as UIToPluginMessage;

  switch (msg.type) {
    case 'GET_CURRENT_FRAME': {
      await notifyCurrentFrames(true);
      break;
    }

    case 'PUBLISH_REVIEW': {
      try {
        const frames = getSelectedFrames();
        if (frames.length !== 1) {
          send({ type: 'ERROR', message: 'Selecione exatamente um frame para publicar o review.' });
          break;
        }
        const frame = frames[0];
        const history = await loadHistory(frame.id);
        if (!history || history.entries.length === 0) {
          send({ type: 'ERROR', message: 'Nenhum baseline salvo. Aguarde um momento e tente novamente.' });
          break;
        }
        const entry = history.entries[history.entries.length - 1];
        const current = takeSnapshot(frame);
        const diffs = diffSnapshots(entry.snapshot, current, { includePosition: false });

        const review: FrameReview = {
          reviewId: Date.now().toString(36),
          frameId: frame.id,
          frameName: frame.name,
          publishedAt: Date.now(),
          publishedBy: figma.currentUser !== null ? figma.currentUser.name : 'Designer',
          description: msg.description,
          items: diffs.map(d => ({ diffResult: d, checkedAt: null, checkedBy: null })),
          status: 'pending',
        };

        await saveReview(review);
        await refreshBadge(frame.id);

        if (authToken !== null) {
          void (async () => {
            try {
              const fileKey = figma.fileKey !== undefined ? figma.fileKey : 'local';
              const backendReview = await apiClient.publishReview(authToken!, {
                fileKey,
                frameName: frame.name,
                frameId: frame.id,
                description: msg.description,
                publishedByUserId: figma.currentUser !== null ? (figma.currentUser.id ?? figma.currentUser.name) : 'unknown',
                publishedByName: figma.currentUser !== null ? figma.currentUser.name : 'Designer',
                items: diffs,
              });
              review.backendReviewId = backendReview.id;
              await saveReview(review);
            } catch (err) {
              console.error('[handoff] publishReview backend error:', String(err));
            }
          })();
        }

        const metas = await Promise.all(frames.map(buildFrameMeta));
        send({ type: 'REVIEW_PUBLISHED', review, frames: metas });
      } catch (err) {
        send({ type: 'ERROR', message: 'Erro ao publicar review: ' + String(err) });
      }
      break;
    }

    case 'ZOOM_TO_NODE': {
      const node = figma.getNodeById(msg.nodeId);
      if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
        createHighlight(node as SceneNode);
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
  }
};

figma.on('selectionchange', async () => {
  await notifyCurrentFrames(true);
});
