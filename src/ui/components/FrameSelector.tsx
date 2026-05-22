interface Props {
  frameName: string | null;
  snapshotSavedAt: number | null;
  isLoading: 'save' | 'diff' | null;
  onSave: () => void;
  onDiff: () => void;
}

export function FrameSelector({ frameName, snapshotSavedAt, isLoading, onSave, onDiff }: Props) {
  const hasFrame = frameName !== null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.label}>Frame selecionado</span>
        {hasFrame ? (
          <span style={styles.frameName}>{frameName}</span>
        ) : (
          <span style={styles.noFrame}>Nenhum frame selecionado</span>
        )}
      </div>

      {snapshotSavedAt !== null && (
        <div style={styles.savedBadge}>
          Versão salva em {new Date(snapshotSavedAt).toLocaleTimeString('pt-BR')}
        </div>
      )}

      <div style={styles.actions}>
        <button
          style={{ ...styles.btn, ...styles.btnSecondary }}
          disabled={!hasFrame || isLoading !== null}
          onClick={onSave}
        >
          {isLoading === 'save' ? 'Salvando…' : 'Salvar versão atual'}
        </button>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          disabled={!hasFrame || isLoading !== null}
          onClick={onDiff}
        >
          {isLoading === 'diff' ? 'Comparando…' : 'Ver o que mudou'}
        </button>
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
  savedBadge: {
    fontSize: 10,
    color: '#2e7d32',
    background: '#e8f5e9',
    borderRadius: 4,
    padding: '3px 6px',
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
