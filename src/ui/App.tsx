import { useEffect, useReducer, useCallback } from 'react';
import type {
  FrameDiffGroup,
  FrameMeta,
  FrameReview,
  PluginToUIMessage,
  ReviewSummary,
  SnapshotEntryMeta,
  UIToPluginMessage,
} from '../shared/types';
import { FrameSelector } from './components/FrameSelector';
import { VersionSelector } from './components/VersionSelector';
import { DiffList } from './components/DiffList';
import { ReviewPanel } from './components/ReviewPanel';

interface AppState {
  frames: FrameMeta[];
  sessionStart: number | null;
  selectedEntryIndex: number;
  frameDiffs: FrameDiffGroup[] | null;
  isLoading: 'baseline' | 'report' | 'diff' | null;
  error: string | null;
  includePosition: boolean;
  activeTab: 'diff' | 'reviews';
  allReviews: ReviewSummary[];
  activeReview: FrameReview | null;
}

type Action =
  | { type: 'FRAMES_UPDATED'; frames: FrameMeta[]; sessionStart: number }
  | { type: 'NO_FRAME' }
  | { type: 'START_BASELINE' }
  | { type: 'START_REPORT' }
  | { type: 'START_DIFF' }
  | { type: 'DIFF_RESULT'; frameDiffs: FrameDiffGroup[] }
  | { type: 'SELECT_VERSION'; index: number }
  | { type: 'SET_INCLUDE_POSITION'; value: boolean }
  | { type: 'SETTINGS_LOADED'; includePosition: boolean }
  | { type: 'REPORT_DONE' }
  | { type: 'ERROR'; message: string }
  | { type: 'SET_TAB'; tab: 'diff' | 'reviews' }
  | { type: 'ALL_REVIEWS_LOADED'; reviews: ReviewSummary[] }
  | { type: 'REVIEW_PUBLISHED'; review: FrameReview; frames: FrameMeta[] }
  | { type: 'REVIEW_UPDATED'; review: FrameReview }
  | { type: 'OPEN_REVIEW'; review: FrameReview }
  | { type: 'CLOSE_REVIEW' };

const initial: AppState = {
  frames: [],
  sessionStart: null,
  selectedEntryIndex: 0,
  frameDiffs: null,
  isLoading: null,
  error: null,
  includePosition: false,
  activeTab: 'diff',
  allReviews: [],
  activeReview: null,
};

function mostRecentIndex(entries: SnapshotEntryMeta[]): number {
  return Math.max(0, entries.length - 1);
}

function toReviewSummary(r: FrameReview): ReviewSummary {
  return {
    frameId: r.frameId,
    frameName: r.frameName,
    reviewId: r.reviewId,
    publishedAt: r.publishedAt,
    publishedBy: r.publishedBy,
    totalItems: r.items.length,
    pendingItems: r.items.filter(i => i.checkedAt === null).length,
    status: r.status,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'FRAMES_UPDATED': {
      const prevIds = state.frames.map((f) => f.id).join(',');
      const nextIds = action.frames.map((f) => f.id).join(',');
      const sameFrames = prevIds === nextIds;
      const singleHistory = action.frames[0]?.historyEntries ?? [];
      return {
        ...state,
        frames: action.frames,
        sessionStart: action.sessionStart || state.sessionStart,
        isLoading: null,
        selectedEntryIndex: sameFrames
          ? state.selectedEntryIndex
          : mostRecentIndex(singleHistory),
        frameDiffs: sameFrames ? state.frameDiffs : null,
        error: null,
      };
    }
    case 'NO_FRAME':
      return {
        ...initial,
        includePosition: state.includePosition,
        activeTab: state.activeTab,
        allReviews: state.allReviews,
      };
    case 'START_BASELINE':
      return { ...state, isLoading: 'baseline', error: null };
    case 'START_REPORT':
      return { ...state, isLoading: 'report', error: null, frameDiffs: null };
    case 'START_DIFF':
      return { ...state, isLoading: 'diff', error: null };
    case 'DIFF_RESULT':
      return { ...state, isLoading: null, frameDiffs: action.frameDiffs };
    case 'REPORT_DONE':
      return { ...state, isLoading: null };
    case 'SELECT_VERSION':
      return { ...state, selectedEntryIndex: action.index, frameDiffs: null };
    case 'SET_INCLUDE_POSITION':
      return { ...state, includePosition: action.value, frameDiffs: null };
    case 'SETTINGS_LOADED':
      return { ...state, includePosition: action.includePosition };
    case 'ERROR':
      return { ...state, isLoading: null, error: action.message };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab, error: null };
    case 'ALL_REVIEWS_LOADED':
      return { ...state, allReviews: action.reviews };
    case 'REVIEW_PUBLISHED': {
      const summary = toReviewSummary(action.review);
      const filtered = state.allReviews.filter(r => r.frameId !== action.review.frameId);
      return {
        ...state,
        frames: action.frames,
        isLoading: null,
        activeTab: 'reviews',
        activeReview: action.review,
        allReviews: [summary, ...filtered],
        error: null,
      };
    }
    case 'REVIEW_UPDATED': {
      const summary = toReviewSummary(action.review);
      return {
        ...state,
        activeReview:
          state.activeReview !== null && state.activeReview.reviewId === action.review.reviewId
            ? action.review
            : state.activeReview,
        allReviews: state.allReviews.map(r =>
          r.reviewId === action.review.reviewId ? summary : r,
        ),
      };
    }
    case 'OPEN_REVIEW':
      return { ...state, activeReview: action.review };
    case 'CLOSE_REVIEW':
      return { ...state, activeReview: null };
  }
}

function post(msg: UIToPluginMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    dispatch({ type: 'START_BASELINE' });
    post({ type: 'GET_CURRENT_FRAME' });
    post({ type: 'GET_SETTINGS' });

    const onMessage = (event: MessageEvent) => {
      const msg = (event.data as { pluginMessage?: PluginToUIMessage }).pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case 'CURRENT_FRAMES':
          dispatch({ type: 'FRAMES_UPDATED', frames: msg.frames, sessionStart: msg.sessionStart });
          break;
        case 'NO_FRAME_SELECTED':
          dispatch({ type: 'NO_FRAME' });
          break;
        case 'SNAPSHOT_SAVED':
          dispatch({ type: 'FRAMES_UPDATED', frames: msg.frames, sessionStart: state.sessionStart ?? 0 });
          break;
        case 'DIFF_RESULT':
          dispatch({ type: 'DIFF_RESULT', frameDiffs: msg.frameDiffs });
          break;
        case 'NO_PREVIOUS_SNAPSHOT':
          dispatch({ type: 'ERROR', message: 'Nenhuma versão salva para comparar.' });
          break;
        case 'REPORT_READY': {
          dispatch({ type: 'REPORT_DONE' });
          const blob = new Blob([msg.html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = msg.fileName;
          a.click();
          URL.revokeObjectURL(url);
          break;
        }
        case 'DIFF_EXPORT': {
          const blob = new Blob([msg.json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = msg.fileName;
          a.click();
          URL.revokeObjectURL(url);
          break;
        }
        case 'SETTINGS':
          dispatch({ type: 'SETTINGS_LOADED', includePosition: msg.includePosition });
          break;
        case 'REVIEW_PUBLISHED':
          dispatch({ type: 'REVIEW_PUBLISHED', review: msg.review, frames: msg.frames });
          break;
        case 'ALL_REVIEWS':
          dispatch({ type: 'ALL_REVIEWS_LOADED', reviews: msg.reviews });
          break;
        case 'REVIEW_UPDATED':
          dispatch({ type: 'REVIEW_UPDATED', review: msg.review });
          break;
        case 'REVIEW_DETAIL':
          dispatch({ type: 'OPEN_REVIEW', review: msg.review });
          break;
        case 'ERROR':
          dispatch({ type: 'ERROR', message: msg.message });
          break;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── derived ────────────────────────────────────────────────────────────────
  const isSingleFrame = state.frames.length === 1;
  const hasAnySnapshot = state.frames.some((f) => f.historyEntries.length > 0);
  const singleHistory: SnapshotEntryMeta[] = isSingleFrame ? state.frames[0].historyEntries : [];
  const sessionActive = state.sessionStart !== null && state.sessionStart > 0;
  const pendingTotal = state.allReviews.reduce((sum, r) => sum + r.pendingItems, 0);

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleGenerateReport = useCallback(() => {
    if (state.frames.length === 0) return;
    dispatch({ type: 'START_REPORT' });
    post({ type: 'GENERATE_REPORT', entryIndex: state.selectedEntryIndex, includePosition: state.includePosition });
  }, [state.frames.length, state.selectedEntryIndex, state.includePosition]);

  const handleDiff = useCallback(() => {
    if (state.frames.length === 0) return;
    dispatch({ type: 'START_DIFF' });
    post({ type: 'GET_DIFF', entryIndex: state.selectedEntryIndex, includePosition: state.includePosition });
  }, [state.frames.length, state.selectedEntryIndex, state.includePosition]);

  const handleZoom = useCallback((nodeId: string) => {
    post({ type: 'ZOOM_TO_NODE', nodeId });
  }, []);

  const handleExportJSON = useCallback(() => {
    if (!state.frameDiffs) return;
    post({ type: 'EXPORT_DIFF', frameDiffs: state.frameDiffs });
  }, [state.frameDiffs]);

  const handleClearHighlights = useCallback(() => {
    post({ type: 'CLEAR_HIGHLIGHTS' });
  }, []);

  const handleSelectVersion = useCallback((index: number) => {
    dispatch({ type: 'SELECT_VERSION', index });
  }, []);

  const handleTogglePosition = useCallback((value: boolean) => {
    dispatch({ type: 'SET_INCLUDE_POSITION', value });
    post({ type: 'SAVE_SETTINGS', includePosition: value });
  }, []);

  const handlePublish = useCallback(() => {
    post({ type: 'PUBLISH_REVIEW', description: '' });
  }, []);

  const handleOpenReviewDetail = useCallback((frameId: string) => {
    post({ type: 'LOAD_REVIEW_DETAIL', frameId });
  }, []);

  const handleCheckItem = useCallback((reviewId: string, frameId: string, nodeId: string, diffType: string) => {
    post({ type: 'CHECK_REVIEW_ITEM', reviewId, frameId, nodeId, diffType });
  }, []);

  const handleUncheckItem = useCallback((reviewId: string, frameId: string, nodeId: string, diffType: string) => {
    post({ type: 'UNCHECK_REVIEW_ITEM', reviewId, frameId, nodeId, diffType });
  }, []);

  const handleNavigateToFrame = useCallback((frameId: string) => {
    post({ type: 'NAVIGATE_TO_FRAME', frameId });
  }, []);

  const noFrames = state.frames.length === 0;
  const showGuide = !noFrames && !hasAnySnapshot && state.frameDiffs === null && !state.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div style={styles.tabBar}>
        <button
          style={{ ...styles.tabBtn, ...(state.activeTab === 'diff' ? styles.tabBtnActive : {}) }}
          onClick={() => dispatch({ type: 'SET_TAB', tab: 'diff' })}
        >
          Diff
        </button>
        <button
          style={{ ...styles.tabBtn, ...(state.activeTab === 'reviews' ? styles.tabBtnActive : {}) }}
          onClick={() => {
            dispatch({ type: 'SET_TAB', tab: 'reviews' });
            post({ type: 'GET_ALL_REVIEWS' });
          }}
        >
          Reviews
          {pendingTotal > 0 && <span style={styles.tabDot}>{pendingTotal}</span>}
        </button>
      </div>

      {/* ── Diff tab ──────────────────────────────────────────────────────── */}
      {state.activeTab === 'diff' && (
        <>
          <FrameSelector
            frames={state.frames}
            hasAnySnapshot={hasAnySnapshot}
            sessionStart={state.sessionStart}
            isLoading={state.isLoading}
            onGenerateReport={handleGenerateReport}
            onPreviewDiff={handleDiff}
          />

          <div style={styles.content}>
            {state.error && <p style={styles.error}>{state.error}</p>}

            {noFrames && <EmptyNoFrame />}
            {showGuide && !state.isLoading && <EmptyNoSnapshot />}
            {state.isLoading === 'baseline' && (
              <div style={styles.loadingMsg}>Capturando baseline do frame…</div>
            )}

            {isSingleFrame && singleHistory.length > 1 && (
              <VersionSelector
                entries={singleHistory}
                selectedIndex={state.selectedEntryIndex}
                onChange={handleSelectVersion}
              />
            )}

            {isSingleFrame && singleHistory.length > 0 && (
              <label style={styles.toggleRow}>
                <div
                  style={{ ...styles.toggle, background: state.includePosition ? '#18a0fb' : '#ddd' }}
                  onClick={() => handleTogglePosition(!state.includePosition)}
                  role="switch"
                  aria-checked={state.includePosition}
                >
                  <div
                    style={{
                      ...styles.toggleKnob,
                      transform: state.includePosition ? 'translateX(14px)' : 'translateX(0)',
                    }}
                  />
                </div>
                <span style={styles.toggleLabel}>Incluir mudanças de posição</span>
              </label>
            )}

            {sessionActive && hasAnySnapshot && state.frameDiffs === null && !state.isLoading && (
              <div style={styles.sessionBanner}>
                <span style={styles.sessionDot} />
                Sessão ativa desde{' '}
                {new Date(state.sessionStart!).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' '}— clique em <strong>Gerar Relatório</strong> quando terminar
              </div>
            )}

            {state.frameDiffs !== null && (
              <>
                <div style={styles.actionBar}>
                  <button style={styles.clearBtn} onClick={handleClearHighlights}>
                    ✕ Limpar highlights
                  </button>
                  <button style={styles.secondaryBtn} onClick={handleExportJSON}>
                    ↓ JSON
                  </button>
                </div>

                {state.frameDiffs.map((group) => (
                  <div key={group.frameId}>
                    {state.frameDiffs!.length > 1 && (
                      <div style={styles.frameHeader}>
                        <span style={styles.frameHeaderName}>{group.frameName}</span>
                        <span style={styles.frameHeaderCount}>
                          {group.diffs.length === 0
                            ? 'sem mudanças'
                            : `${group.diffs.length} ${group.diffs.length === 1 ? 'mudança' : 'mudanças'}`}
                        </span>
                      </div>
                    )}
                    <DiffList diffs={group.diffs} savedAt={group.savedAt} onZoom={handleZoom} />
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Reviews tab ───────────────────────────────────────────────────── */}
      {state.activeTab === 'reviews' && (
        <ReviewPanel
          allReviews={state.allReviews}
          activeReview={state.activeReview}
          onPublish={handlePublish}
          onOpenDetail={handleOpenReviewDetail}
          onCloseDetail={() => dispatch({ type: 'CLOSE_REVIEW' })}
          onCheck={handleCheckItem}
          onUncheck={handleUncheckItem}
          onNavigate={handleNavigateToFrame}
        />
      )}

    </div>
  );
}

function EmptyNoFrame() {
  return (
    <div style={emptyStyles.wrap}>
      <div style={emptyStyles.icon}><div style={emptyStyles.frameIcon} /></div>
      <p style={emptyStyles.title}>Nenhum frame selecionado</p>
      <p style={emptyStyles.description}>
        Clique em um frame no canvas do Figma para começar.
      </p>
    </div>
  );
}

function EmptyNoSnapshot() {
  return (
    <div style={emptyStyles.wrap}>
      <div style={emptyStyles.icon}>
        <div style={emptyStyles.snapshotIcon}><div style={emptyStyles.snapshotInner} /></div>
      </div>
      <p style={emptyStyles.title}>Aguardando baseline…</p>
      <p style={emptyStyles.description}>
        Selecione um frame para o plugin capturar o estado inicial automaticamente.
      </p>
    </div>
  );
}

const styles = {
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #e5e5e5',
    background: '#fafafa',
    flexShrink: 0,
  },
  tabBtn: {
    flex: 1,
    padding: '8px 0',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'none',
    fontSize: 12,
    fontWeight: 600,
    color: '#888',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabBtnActive: {
    color: '#18a0fb',
    borderBottom: '2px solid #18a0fb',
  },
  tabDot: {
    background: '#c62828',
    color: '#fff',
    borderRadius: '50%',
    minWidth: 16,
    height: 16,
    fontSize: 9,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 3px',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 12px 12px',
  },
  error: {
    color: '#c0392b',
    fontSize: '11px',
    marginTop: 8,
  },
  loadingMsg: {
    fontSize: 11,
    color: '#888',
    padding: '12px 0',
    textAlign: 'center' as const,
  },
  sessionBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    background: '#e8f5e9',
    border: '1px solid #c8e6c9',
    borderRadius: 7,
    padding: '8px 12px',
    fontSize: 11,
    color: '#2e7d32',
    marginBottom: 10,
  },
  sessionDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#2e7d32',
    flexShrink: 0,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0 10px',
    cursor: 'pointer',
  },
  toggle: {
    position: 'relative',
    width: 28,
    height: 16,
    borderRadius: 8,
    flexShrink: 0,
    transition: 'background 0.15s',
    cursor: 'pointer',
  },
  toggleKnob: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#fff',
    transition: 'transform 0.15s',
  },
  toggleLabel: {
    fontSize: 11,
    color: '#555',
    userSelect: 'none',
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: 8,
  },
  clearBtn: {
    background: 'none',
    border: '1px solid #f5c2c0',
    borderRadius: 5,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#c0392b',
    cursor: 'pointer',
  },
  secondaryBtn: {
    background: 'none',
    border: '1px solid #ddd',
    borderRadius: 5,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#555',
    cursor: 'pointer',
  },
  frameHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0 4px',
    borderTop: '1px solid #f0f0f0',
    marginTop: 4,
    marginBottom: 2,
  },
  frameHeaderName: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1e1e1e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: '70%',
  },
  frameHeaderCount: {
    fontSize: 10,
    color: '#aaa',
    flexShrink: 0,
  },
} satisfies Record<string, React.CSSProperties>;

const emptyStyles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '32px 20px 0',
    gap: 10,
  },
  icon: { marginBottom: 4 },
  frameIcon: {
    width: 36,
    height: 36,
    border: '2.5px dashed #ccc',
    borderRadius: 6,
  },
  snapshotIcon: {
    width: 36,
    height: 36,
    border: '2.5px solid #ccc',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapshotInner: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '2px solid #ccc',
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e1e1e',
    margin: 0,
  },
  description: {
    fontSize: 11,
    color: '#888',
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 260,
  },
} satisfies Record<string, React.CSSProperties>;
