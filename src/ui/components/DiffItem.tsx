import type { DiffResult, DiffType, Severity } from '../../shared/types';

interface Props {
  diff: DiffResult;
  onZoom: (nodeId: string) => void;
}

const DIFF_LABELS: Record<DiffType, string> = {
  COLOR: 'Cor',
  SIZE: 'Tamanho',
  TYPOGRAPHY: 'Tipografia',
  CONTENT: 'Conteúdo',
  ADDED: 'Adicionado',
  REMOVED: 'Removido',
  COMPONENT: 'Componente',
  LAYOUT: 'Layout',
  POSITION: 'Posição',
};

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string }> = {
  high: { bg: '#fdecea', text: '#c62828' },
  medium: { bg: '#fff3e0', text: '#e65100' },
  low: { bg: '#f3f3f3', text: '#555' },
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'visível' : 'oculto';
  if (typeof value === 'number') return String(Math.round(value * 100) / 100);
  if (typeof value === 'string') return `"${value}"`;
  return JSON.stringify(value);
}

export function DiffItem({ diff, onZoom }: Props) {
  const sev = SEVERITY_COLORS[diff.severity];

  return (
    <button style={styles.row} onClick={() => onZoom(diff.nodeId)}>
      <div style={styles.left}>
        <span
          style={{
            ...styles.badge,
            background: sev.bg,
            color: sev.text,
          }}
        >
          {DIFF_LABELS[diff.type]}
        </span>
        <span style={styles.nodeName}>{diff.nodeName}</span>
      </div>
      <div style={styles.values}>
        {diff.type !== 'ADDED' && diff.type !== 'REMOVED' && (
          <>
            <span style={styles.before}>{formatValue(diff.before)}</span>
            <span style={styles.arrow}>→</span>
            <span style={styles.after}>{formatValue(diff.after)}</span>
          </>
        )}
        {diff.type === 'ADDED' && <span style={styles.after}>adicionado</span>}
        {diff.type === 'REMOVED' && <span style={styles.before}>removido</span>}
      </div>
    </button>
  );
}

const styles = {
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: '100%',
    padding: '8px 10px',
    background: 'none',
    border: '1px solid #ebebeb',
    borderRadius: 6,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.1s',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '2px 5px',
    borderRadius: 3,
    flexShrink: 0,
  },
  nodeName: {
    fontSize: 11,
    fontWeight: 600,
    color: '#1e1e1e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  values: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: '#666',
    paddingLeft: 2,
    flexWrap: 'wrap' as const,
  },
  before: {
    color: '#c62828',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  arrow: {
    color: '#999',
  },
  after: {
    color: '#2e7d32',
    fontFamily: 'monospace',
    fontSize: 10,
  },
} satisfies Record<string, React.CSSProperties>;
