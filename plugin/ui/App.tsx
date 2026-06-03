import { useEffect, useReducer, useCallback, useState } from 'react';
import type {
  FrameMeta,
  PluginToUIMessage,
  UIToPluginMessage,
} from '../shared/types';
import { FrameSelector } from './components/FrameSelector';

const DASHBOARD_URL = 'https://handoff-diff-tool.vercel.app';

type PluginStatus = 'no_frame' | 'ready' | 'publishing' | 'published' | 'error';

interface AppState {
  status: PluginStatus;
  frames: FrameMeta[];
  sessionStart: number | null;
  authStatus: 'loading' | 'authenticated' | 'offline';
  userName: string | null;
  error: string | null;
  synced: boolean;
}

type Action =
  | { type: 'NO_FRAME' }
  | { type: 'FRAMES_UPDATED'; frames: FrameMeta[]; sessionStart: number }
  | { type: 'PUBLISH_START' }
  | { type: 'PUBLISH_SUCCESS'; synced: boolean }
  | { type: 'PUBLISH_RESET' }
  | { type: 'ERROR'; message: string }
  | { type: 'RETRY' }
  | { type: 'AUTH_STATUS'; authenticated: boolean; userName: string | null };

const initial: AppState = {
  status: 'no_frame',
  frames: [],
  sessionStart: null,
  authStatus: 'loading',
  userName: null,
  error: null,
  synced: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'NO_FRAME':
      return { ...initial, authStatus: state.authStatus, userName: state.userName };
    case 'FRAMES_UPDATED':
      return {
        ...state,
        status: state.status === 'published' ? 'published' : 'ready',
        frames: action.frames,
        sessionStart: action.sessionStart || state.sessionStart,
        error: null,
      };
    case 'PUBLISH_START':
      return { ...state, status: 'publishing', error: null };
    case 'PUBLISH_SUCCESS':
      return { ...state, status: 'published', error: null, synced: action.synced };
    case 'PUBLISH_RESET':
      return { ...state, status: state.frames.length > 0 ? 'ready' : 'no_frame' };
    case 'ERROR':
      return { ...state, status: 'error', error: action.message };
    case 'RETRY':
      return { ...state, status: state.frames.length > 0 ? 'ready' : 'no_frame', error: null };
    case 'AUTH_STATUS':
      return {
        ...state,
        authStatus: action.authenticated ? 'authenticated' : 'offline',
        userName: action.userName,
      };
  }
}

function post(msg: UIToPluginMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [figmaFileUrl, setFigmaFileUrl] = useState('');

  // Init
  useEffect(() => {
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
          dispatch({ type: 'FRAMES_UPDATED', frames: msg.frames, sessionStart: 0 });
          break;
        case 'REVIEW_PUBLISHED':
          dispatch({ type: 'PUBLISH_SUCCESS', synced: msg.synced ?? false });
          break;
        case 'SETTINGS':
          if (msg.figmaFileUrl) setFigmaFileUrl(msg.figmaFileUrl);
          break;
        case 'AUTH_STATUS':
          dispatch({ type: 'AUTH_STATUS', authenticated: msg.authenticated, userName: msg.userName });
          break;
        case 'ERROR':
          dispatch({ type: 'ERROR', message: msg.message });
          break;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Auto-reset after published state
  useEffect(() => {
    if (state.status !== 'published') return;
    const timer = setTimeout(() => dispatch({ type: 'PUBLISH_RESET' }), 3000);
    return () => clearTimeout(timer);
  }, [state.status]);

  const handlePublish = useCallback(() => {
    dispatch({ type: 'PUBLISH_START' });
    post({ type: 'PUBLISH_REVIEW', description: '', figmaFileUrl: figmaFileUrl || undefined });
  }, [figmaFileUrl]);

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setFigmaFileUrl(val);
    post({ type: 'SAVE_FIGMA_URL', figmaFileUrl: val });
  }

  return (
    <div style={styles.root}>
      {/* Status 1 — Nenhum frame */}
      {state.status === 'no_frame' && (
        <div style={styles.center}>
          <div style={styles.emptyIcon} />
          <p style={styles.emptyTitle}>Selecione um frame para começar</p>
          <p style={styles.emptySubtitle}>Clique em qualquer frame no canvas do Figma</p>
        </div>
      )}

      {/* Status 2 — Pronto para publicar */}
      {state.status === 'ready' && (
        <>
          <FrameSelector
            frames={state.frames}
            authStatus={state.authStatus}
            userName={state.userName}
          />
          <div style={styles.content}>
            <div style={styles.urlField}>
              <label style={styles.urlLabel}>URL do arquivo (opcional)</label>
              <input
                style={styles.urlInput}
                type="url"
                placeholder="https://www.figma.com/design/ABC123/..."
                value={figmaFileUrl}
                onChange={handleUrlChange}
              />
            </div>
            <button style={styles.publishBtn} onClick={handlePublish}>
              Publicar review
            </button>
            <p style={styles.hint}>Detecta as mudanças e notifica o time</p>
          </div>
        </>
      )}

      {/* Status 3 — Publicando */}
      {state.status === 'publishing' && (
        <div style={styles.center}>
          <div style={styles.spinner} />
          <p style={styles.emptyTitle}>Publicando review...</p>
        </div>
      )}

      {/* Status 4 — Publicado */}
      {state.status === 'published' && (
        <div style={styles.center}>
          <div style={styles.successIcon}>✓</div>
          <p style={styles.successTitle}>
            {state.synced
              ? 'Review publicado e sincronizado com o time!'
              : 'Review salvo localmente'}
          </p>
          <p style={styles.successSubtitle}>
            {state.synced
              ? 'O time será notificado'
              : 'Conecte-se para sincronizar com o time'}
          </p>
          {state.synced && (
            <a
              href={DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              style={styles.dashboardLink}
            >
              Ver na dashboard →
            </a>
          )}
        </div>
      )}

      {/* Status 5 — Erro */}
      {state.status === 'error' && (
        <div style={styles.center}>
          <div style={styles.errorIcon}>!</div>
          <p style={styles.errorTitle}>{state.error ?? 'Ocorreu um erro'}</p>
          <button style={styles.retryBtn} onClick={() => dispatch({ type: 'RETRY' })}>
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '0 24px',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '0 16px 24px',
  },
  emptyIcon: {
    width: 40,
    height: 40,
    border: '2.5px dashed #ccc',
    borderRadius: 8,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e1e1e',
    margin: 0,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#888',
    margin: 0,
  },
  urlField: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  urlLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  urlInput: {
    width: '100%',
    padding: '7px 10px',
    fontSize: 11,
    color: '#333',
    background: '#f7f7f7',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  publishBtn: {
    width: '100%',
    padding: '12px 0',
    background: '#18a0fb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.01em',
  },
  hint: {
    fontSize: 11,
    color: '#aaa',
    margin: 0,
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid #e5e5e5',
    borderTop: '3px solid #18a0fb',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#22c55e',
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1e1e1e',
    margin: 0,
  },
  successSubtitle: {
    fontSize: 11,
    color: '#888',
    margin: 0,
  },
  dashboardLink: {
    marginTop: 6,
    fontSize: 12,
    color: '#18a0fb',
    textDecoration: 'none',
    fontWeight: 600,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#ef4444',
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 12,
    color: '#c0392b',
    margin: '0 0 8px',
    lineHeight: 1.4,
  },
  retryBtn: {
    padding: '8px 20px',
    background: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
