interface FrameInfo {
  id: string;
  name: string;
}

interface Props {
  frames: FrameInfo[];
  hasAnySnapshot: boolean;
  sessionStart: number | null;
  isLoading: 'baseline' | 'report' | 'diff' | null;
  onGenerateReport: () => void;
  onPreviewDiff: () => void;
}

export function FrameSelector({
  frames,
  hasAnySnapshot,
  sessionStart,
  isLoading,
  onGenerateReport,
  onPreviewDiff,
}: Props) {
  const hasFrames = frames.length > 0;
  const isMulti = frames.length > 1;
  const sessionActive = sessionStart !== null && sessionStart > 0;
  const canAct = hasFrames && hasAnySnapshot && isLoading === null;

  function renderFrameLabel() {
    if (!hasFrames) return <span style={styles.noFrame}>Nenhum frame selecionado</span>;
    if (isMulti) return <span style={styles.frameName}>{frames.length} frames selecionados</span>;
    return <span style={styles.frameName}>{frames[0].name}</span>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.label}>
          {isMulti ? 'Frames selecionados' : 'Frame selecionado'}
        </span>
        {renderFrameLabel()}
      </div>

      {isMulti && (
        <div style={styles.frameList}>
          {frames.map((f) => (
            <span key={f.id} style={styles.frameChip}>{f.name}</span>
          ))}
        </div>
      )}

      {sessionActive && !isMulti && (
        <div style={styles.sessionBadge}>
          ● Sessão ativa desde{' '}
          {new Date(sessionStart!).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}

      {isLoading === 'baseline' && (
        <div style={styles.loadingBadge}>Capturando baseline…</div>
      )}

      <div style={styles.actions}>
        {/* Preview diff — secondary */}
        <span
          style={{ flex: 1, cursor: canAct ? 'default' : 'not-allowed' }}
          title={!hasFrames ? 'Selecione um frame' : !hasAnySnapshot ? 'Aguarde o baseline ser capturado' : undefined}
        >
          <button
            style={{
              ...styles.btn,
              ...styles.btnSecondary,
              opacity: canAct ? 1 : 0.45,
              pointerEvents: canAct ? 'auto' : 'none',
              width: '100%',
            }}
            disabled={!canAct}
            onClick={onPreviewDiff}
          >
            {isLoading === 'diff' ? 'Comparando…' : 'Ver mudanças'}
          </button>
        </span>

        {/* Generate report — primary */}
        <span
          style={{ flex: 2, cursor: canAct ? 'default' : 'not-allowed' }}
          title={!hasFrames ? 'Selecione um frame' : !hasAnySnapshot ? 'Aguarde o baseline ser capturado' : undefined}
        >
          <button
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              opacity: canAct ? 1 : 0.45,
              pointerEvents: canAct ? 'auto' : 'none',
              width: '100%',
            }}
            disabled={!canAct}
            onClick={onGenerateReport}
          >
            {isLoading === 'report' ? 'Gerando relatório…' : '↓ Gerar Relatório'}
          </button>
        </span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '12px',
    borderBottom: '1px solid #e5e5e5',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: '#888',
  },
  frameName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e1e1e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  noFrame: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
  },
  frameList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
  },
  frameChip: {
    fontSize: 10,
    color: '#555',
    background: '#f0f0f0',
    borderRadius: 4,
    padding: '2px 6px',
    maxWidth: 120,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  sessionBadge: {
    fontSize: 10,
    color: '#2e7d32',
    background: '#e8f5e9',
    borderRadius: 4,
    padding: '3px 8px',
    alignSelf: 'flex-start',
  },
  loadingBadge: {
    fontSize: 10,
    color: '#e65100',
    background: '#fff3e0',
    borderRadius: 4,
    padding: '3px 8px',
    alignSelf: 'flex-start',
  },
  actions: {
    display: 'flex',
    gap: 6,
  },
  btn: {
    flex: 1,
    padding: '7px 0',
    border: 'none',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnSecondary: {
    background: '#f0f0f0',
    color: '#333',
  },
  btnPrimary: {
    background: '#18a0fb',
    color: '#fff',
  },
} satisfies Record<string, React.CSSProperties>;
