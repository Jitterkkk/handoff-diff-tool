interface FrameInfo {
  id: string;
  name: string;
}

interface Props {
  frames: FrameInfo[];
  authStatus: 'loading' | 'authenticated' | 'offline';
  userName: string | null;
}

export function FrameSelector({ frames, authStatus, userName }: Props) {
  const isMulti = frames.length > 1;

  const dotColor =
    authStatus === 'authenticated' ? '#22c55e' :
    authStatus === 'loading' ? '#eab308' : '#aaa';

  const statusText =
    authStatus === 'authenticated'
      ? 'Sincronizado' + (userName ? ' · ' + userName : '')
      : authStatus === 'loading'
      ? 'Conectando...'
      : 'Offline';

  return (
    <div style={styles.container}>
      {/* Frame name(s) */}
      <div style={styles.header}>
        <span style={styles.label}>
          {isMulti ? 'Frames selecionados' : 'Frame selecionado'}
        </span>
        {isMulti ? (
          <div style={styles.frameList}>
            {frames.map(f => (
              <span key={f.id} style={styles.frameChip}>{f.name}</span>
            ))}
          </div>
        ) : (
          <span style={styles.frameName}>{frames[0]?.name ?? '—'}</span>
        )}
      </div>

      {/* Auth indicator */}
      <div style={styles.authRow}>
        <span style={{ ...styles.dot, background: dotColor }} />
        <span style={styles.authLabel}>{statusText}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '12px 14px 10px',
    borderBottom: '1px solid #e5e5e5',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
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
    fontWeight: 700,
    color: '#1e1e1e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
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
  authRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  authLabel: {
    fontSize: 10,
    color: '#888',
  },
};
