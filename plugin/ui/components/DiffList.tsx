import type { DiffResult, Severity } from '../../shared/types';
import { DiffItem } from './DiffItem';

interface Props {
  diffs: DiffResult[];
  savedAt: number | null;
  onZoom: (nodeId: string) => void;
}

const SEVERITY_ORDER: Severity[] = ['high', 'medium', 'low'];
const SEVERITY_LABELS: Record<Severity, string> = {
  high: 'Alta prioridade',
  medium: 'Média prioridade',
  low: 'Baixa prioridade',
};

export function DiffList({ diffs, savedAt, onZoom }: Props) {
  if (diffs.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyIcon}>✓</span>
        <p style={styles.emptyText}>Nenhuma diferença encontrada em relação à versão salva.</p>
      </div>
    );
  }

  const grouped = SEVERITY_ORDER.reduce<Record<Severity, DiffResult[]>>(
    (acc, sev) => {
      acc[sev] = diffs.filter((d) => d.severity === sev);
      return acc;
    },
    { high: [], medium: [], low: [] },
  );

  return (
    <div>
      {savedAt !== null && (
        <p style={styles.meta}>
          Comparando com versão de {new Date(savedAt).toLocaleString('pt-BR')} —{' '}
          <strong>{diffs.length}</strong> {diffs.length === 1 ? 'mudança' : 'mudanças'}
        </p>
      )}

      {SEVERITY_ORDER.map((sev) => {
        const items = grouped[sev];
        if (items.length === 0) return null;
        return (
          <section key={sev} style={styles.section}>
            <h3 style={styles.sectionTitle}>
              {SEVERITY_LABELS[sev]} ({items.length})
            </h3>
            <div style={styles.list}>
              {items.map((diff, i) => (
                <DiffItem key={`${diff.nodeId}-${diff.type}-${i}`} diff={diff} onZoom={onZoom} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const styles = {
  meta: {
    fontSize: 11,
    color: '#888',
    marginBottom: 12,
    lineHeight: 1.4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: '#888',
    marginBottom: 6,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '32px 16px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 28,
    color: '#2e7d32',
  },
  emptyText: {
    fontSize: 12,
    color: '#888',
    lineHeight: 1.5,
  },
} satisfies Record<string, React.CSSProperties>;
