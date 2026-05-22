interface FrameInfo {
  id: string;
  name: string;
}

interface Props {
  frames: FrameInfo[];
  hasAnySnapshot: boolean;
  snapshotSavedAt: number | null;
  isLoading: 'save' | 'diff' | null;
  onSave: () => void;
  onDiff: () => void;
}

export function FrameSelector({
  frames,
  hasAnySnapshot,
  snapshotSavedAt,
  isLoading,
  onSave,
  onDiff,
}: Props) {
  const hasFrames = frames.length > 0;
  const isMulti = frames.length > 1;
  const canSave = hasFrames && isLoading === null;
  const canDiff = hasFrames && hasAnySnapshot && isLoading === null;

  function renderFrameLabel() {
    if (!hasFrames) return <span style={styles.noFrame}>Nenhum frame selecionado</span>;
    if (isMulti) {
      return <span style={styles.frameName}>{frames.length} frames selecionados</span>;
    }
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
            <span key={f.id} style={styles.frameChip}>
              {f.name}
            </span>
          ))}
        </div>
      )}

      {!isMulti && snapshotSavedAt !== null && (
        <div style={styles.savedBadge}>
          Versão salva em {new Date(snapshotSavedAt).toLocaleTimeString('pt-BR')}
        </div>
      )}

      <div style={styles.actions}>
        <button
          style={{ ...styles.btn, ...styles.btnSecondary, opacity: canSave ? 1 : 0.45 }}
          disabled={!canSave}
          onClick={onSave}
        >
          {isLoading === 'save'
            ? 'Salvando…'
            : isMulti
              ? `Salvar ${frames.length} frames`
              : 'Salvar versão atual'}
        </button>

        <span
          style={{ flex: 1, cursor: canDiff ? 'default' : 'not-allowed' }}
          title={
            !hasFrames
              ? 'Selecione um frame para comparar'
              : !hasAnySnapshot
                ? 'Salve uma versão antes de comparar'
                : undefined
          }
        >
          <button
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              opacity: canDiff ? 1 : 0.45,
              pointerEvents: canDiff ? 'auto' : 'none',
              width: '100%',
            }}
            disabled={!canDiff}
            onClick={onDiff}
          >
            {isLoading === 'diff' ? 'Comparando…' : 'Ver o que mudou'}
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
