import { useEffect, useReducer, useCallback } from 'react';
import type { DiffResult, PluginToUIMessage, UIToPluginMessage } from '../shared/types';
import { FrameSelector } from './components/FrameSelector';
import { DiffList } from './components/DiffList';

interface FrameInfo {
  id: string;
  name: string;
}

interface AppState {
  frame: FrameInfo | null;
  snapshotSavedAt: number | null;
  diffs: DiffResult[] | null;
  diffSavedAt: number | null;
  isLoading: 'save' | 'diff' | null;
  noSnapshot: boolean;
  error: string | null;
}

type Action =
  | { type: 'FRAME_SELECTED'; frame: FrameInfo }
  | { type: 'NO_FRAME' }
  | { type: 'START_SAVE' }
  | { type: 'START_DIFF' }
  | { type: 'SNAPSHOT_SAVED'; savedAt: number }
  | { type: 'DIFF_RESULT'; diffs: DiffResult[]; savedAt: number }
  | { type: 'NO_SNAPSHOT' }
  | { type: 'ERROR'; message: string };

const initial: AppState = {
  frame: null,
  snapshotSavedAt: null,
  diffs: null,
  diffSavedAt: null,
  isLoading: null,
  noSnapshot: false,
  error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'FRAME_SELECTED':
      return {
        ...state,
        frame: action.frame,
        error: null,
        noSnapshot: false,
        // Clear diffs if a different frame is selected
        diffs: state.frame?.id === action.frame.id ? state.diffs : null,
        diffSavedAt: state.frame?.id === action.frame.id ? state.diffSavedAt : null,
        snapshotSavedAt: state.frame?.id === action.frame.id ? state.snapshotSavedAt : null,
      };
    case 'NO_FRAME':
      return { ...initial };
    case 'START_SAVE':
      return { ...state, isLoading: 'save', error: null };
    case 'START_DIFF':
      return { ...state, isLoading: 'diff', error: null, noSnapshot: false };
    case 'SNAPSHOT_SAVED':
      return { ...state, isLoading: null, snapshotSavedAt: action.savedAt, diffs: null };
    case 'DIFF_RESULT':
      return {
        ...state,
        isLoading: null,
        diffs: action.diffs,
        diffSavedAt: action.savedAt,
        noSnapshot: false,
      };
    case 'NO_SNAPSHOT':
      return { ...state, isLoading: null, noSnapshot: true, diffs: null };
    case 'ERROR':
      return { ...state, isLoading: null, error: action.message };
  }
}

function post(msg: UIToPluginMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    post({ type: 'GET_CURRENT_FRAME' });

    const onMessage = (event: MessageEvent) => {
      const msg = (event.data as { pluginMessage?: PluginToUIMessage }).pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case 'CURRENT_FRAME':
          dispatch({ type: 'FRAME_SELECTED', frame: { id: msg.frameId, name: msg.frameName } });
          break;
        case 'NO_FRAME_SELECTED':
          dispatch({ type: 'NO_FRAME' });
          break;
        case 'SNAPSHOT_SAVED':
          dispatch({ type: 'SNAPSHOT_SAVED', savedAt: msg.savedAt });
          break;
        case 'DIFF_RESULT':
          dispatch({ type: 'DIFF_RESULT', diffs: msg.diffs, savedAt: msg.savedAt });
          break;
        case 'NO_PREVIOUS_SNAPSHOT':
          dispatch({ type: 'NO_SNAPSHOT' });
          break;
        case 'ERROR':
          dispatch({ type: 'ERROR', message: msg.message });
          break;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const handleSave = useCallback(() => {
    if (!state.frame) return;
    dispatch({ type: 'START_SAVE' });
    post({ type: 'SAVE_SNAPSHOT', frameId: state.frame.id });
  }, [state.frame]);

  const handleDiff = useCallback(() => {
    if (!state.frame) return;
    dispatch({ type: 'START_DIFF' });
    post({ type: 'GET_DIFF', frameId: state.frame.id });
  }, [state.frame]);

  const handleZoom = useCallback((nodeId: string) => {
    post({ type: 'ZOOM_TO_NODE', nodeId });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <FrameSelector
        frameName={state.frame?.name ?? null}
        snapshotSavedAt={state.snapshotSavedAt}
        isLoading={state.isLoading}
        onSave={handleSave}
        onDiff={handleDiff}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px' }}>
        {state.error && (
          <p style={{ color: '#c0392b', fontSize: '11px', marginTop: 8 }}>{state.error}</p>
        )}
        {state.noSnapshot && (
          <div style={styles.hint}>
            Nenhuma versão salva para este frame. Clique em <strong>Salvar versão</strong> primeiro.
          </div>
        )}
        {state.diffs !== null && (
          <DiffList diffs={state.diffs} savedAt={state.diffSavedAt} onZoom={handleZoom} />
        )}
      </div>
    </div>
  );
}

const styles = {
  hint: {
    marginTop: 12,
    padding: '10px 12px',
    background: '#fff8e1',
    border: '1px solid #ffe082',
    borderRadius: 6,
    fontSize: 11,
    color: '#5d4037',
    lineHeight: 1.5,
  },
} satisfies Record<string, React.CSSProperties>;
