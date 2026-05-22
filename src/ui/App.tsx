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
  hasSnapshot: boolean;
  snapshotSavedAt: number | null;
  diffs: DiffResult[] | null;
  diffSavedAt: number | null;
  isLoading: 'save' | 'diff' | null;
  error: string | null;
}

type Action =
  | { type: 'FRAME_SELECTED'; frame: FrameInfo; hasSnapshot: boolean; snapshotSavedAt: number | null }
  | { type: 'NO_FRAME' }
  | { type: 'START_SAVE' }
  | { type: 'START_DIFF' }
  | { type: 'SNAPSHOT_SAVED'; savedAt: number }
  | { type: 'DIFF_RESULT'; diffs: DiffResult[]; savedAt: number }
  | { type: 'ERROR'; message: string };

const initial: AppState = {
  frame: null,
  hasSnapshot: false,
  snapshotSavedAt: null,
  diffs: null,
  diffSavedAt: null,
  isLoading: null,
  error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'FRAME_SELECTED': {
      const sameFrame = state.frame?.id === action.frame.id;
      return {
        ...state,
        frame: action.frame,
        hasSnapshot: action.hasSnapshot,
        snapshotSavedAt: action.snapshotSavedAt,
        error: null,
        diffs: sameFrame ? state.diffs : null,
        diffSavedAt: sameFrame ? state.diffSavedAt : null,
      };
    }
    case 'NO_FRAME':
      return { ...initial };
    case 'START_SAVE':
      return { ...state, isLoading: 'save', error: null };
    case 'START_DIFF':
      return { ...state, isLoading: 'diff', error: null };
    case 'SNAPSHOT_SAVED':
      return { ...state, isLoading: null, hasSnapshot: true, snapshotSavedAt: action.savedAt, diffs: null };
    case 'DIFF_RESULT':
      return { ...state, isLoading: null, diffs: action.diffs, diffSavedAt: action.savedAt };
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
          dispatch({
            type: 'FRAME_SELECTED',
            frame: { id: msg.frameId, name: msg.frameName },
            hasSnapshot: msg.hasSnapshot,
            snapshotSavedAt: msg.snapshotSavedAt,
          });
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
          // Não deve acontecer (UI agora sabe antes de pedir), mas protege
          dispatch({ type: 'ERROR', message: 'Nenhuma versão salva para este frame.' });
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

  const showGuide = state.frame !== null && !state.hasSnapshot && state.diffs === null && !state.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <FrameSelector
        frameName={state.frame?.name ?? null}
        hasSnapshot={state.hasSnapshot}
        snapshotSavedAt={state.snapshotSavedAt}
        isLoading={state.isLoading}
        onSave={handleSave}
        onDiff={handleDiff}
      />

      <div style={styles.content}>
        {state.error && <p style={styles.error}>{state.error}</p>}

        {state.frame === null && <EmptyNoFrame />}
        {showGuide && <EmptyNoSnapshot />}

        {state.diffs !== null && (
          <DiffList diffs={state.diffs} savedAt={state.diffSavedAt} onZoom={handleZoom} />
        )}
      </div>
    </div>
  );
}

function EmptyNoFrame() {
  return (
    <div style={emptyStyles.wrap}>
      <div style={emptyStyles.icon}>
        <div style={emptyStyles.frameIcon} />
      </div>
      <p style={emptyStyles.title}>Nenhum frame selecionado</p>
      <p style={emptyStyles.description}>
        Clique em um frame no canvas do Figma para começar a usar o Handoff Diff Tool.
      </p>
    </div>
  );
}

function EmptyNoSnapshot() {
  return (
    <div style={emptyStyles.wrap}>
      <div style={emptyStyles.icon}>
        <div style={emptyStyles.snapshotIcon}>
          <div style={emptyStyles.snapshotInner} />
        </div>
      </div>
      <p style={emptyStyles.title}>Nenhuma versão salva</p>
      <p style={emptyStyles.description}>
        Clique em <strong style={{ color: '#1e1e1e' }}>Salvar versão atual</strong> para
        registrar o estado do frame agora. Depois é só voltar aqui e ver o que mudou.
      </p>
    </div>
  );
}

const styles = {
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
  icon: {
    marginBottom: 4,
  },
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
