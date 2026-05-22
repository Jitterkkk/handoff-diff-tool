import type { SnapshotEntryMeta } from '../../shared/types';

interface Props {
  entries: SnapshotEntryMeta[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

function formatSavedAt(savedAt: number): string {
  const d = new Date(savedAt);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();

  return isToday
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function buildOptionLabel(entry: SnapshotEntryMeta, isNewest: boolean, isOldest: boolean, total: number): string {
  const time = formatSavedAt(entry.savedAt);
  const vNum = `v${entry.index + 1}`;
  const tag = isNewest ? ' · mais recente' : isOldest && total > 1 ? ' · mais antiga' : '';
  const lbl = entry.label ? ` — ${entry.label}` : '';
  return `${time} (${vNum}${tag})${lbl}`;
}

export function VersionSelector({ entries, selectedIndex, onChange }: Props) {
  if (entries.length === 0) return null;

  // Exibe do mais recente ao mais antigo
  const reversed = [...entries].reverse();

  return (
    <div style={styles.container}>
      <label style={styles.label} htmlFor="version-select">
        Comparar versão atual com
      </label>
      <select
        id="version-select"
        style={styles.select}
        value={selectedIndex}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {reversed.map((entry) => {
          const isNewest = entry.index === entries.length - 1;
          const isOldest = entry.index === 0;
          return (
            <option key={entry.index} value={entry.index}>
              {buildOptionLabel(entry, isNewest, isOldest, entries.length)}
            </option>
          );
        })}
      </select>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '10px 0 6px',
    borderBottom: '1px solid #f0f0f0',
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: '#888',
  },
  select: {
    width: '100%',
    padding: '5px 8px',
    fontSize: 11,
    border: '1px solid #ddd',
    borderRadius: 5,
    background: '#fafafa',
    color: '#1e1e1e',
    cursor: 'pointer',
    outline: 'none',
  },
} satisfies Record<string, React.CSSProperties>;
