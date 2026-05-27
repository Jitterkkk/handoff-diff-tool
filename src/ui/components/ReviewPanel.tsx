import type { DiffType, FrameReview, ReviewItem, ReviewSummary, Severity } from '../../shared/types';

interface Props {
  allReviews: ReviewSummary[];
  activeReview: FrameReview | null;
  onPublish: () => void;
  onOpenDetail: (frameId: string) => void;
  onCloseDetail: () => void;
  onCheck: (reviewId: string, frameId: string, nodeId: string, diffType: string) => void;
  onUncheck: (reviewId: string, frameId: string, nodeId: string, diffType: string) => void;
  onNavigate: (frameId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fff3e0', text: '#e65100' },
  in_progress: { bg: '#e3f2fd', text: '#1565c0' },
  done: { bg: '#e8f5e9', text: '#2e7d32' },
};

const SEVERITY_ORDER: Severity[] = ['high', 'medium', 'low'];

const SEVERITY_LABELS: Record<Severity, string> = {
  high: 'Alta prioridade',
  medium: 'Média prioridade',
  low: 'Baixa prioridade',
};

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

const SEVERITY_BADGE: Record<Severity, { bg: string; text: string }> = {
  high: { bg: '#fdecea', text: '#c62828' },
  medium: { bg: '#fff3e0', text: '#e65100' },
  low: { bg: '#f3f3f3', text: '#555' },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'visível' : 'oculto';
  if (typeof value === 'number') return String(Math.round(value * 100) / 100);
  if (typeof value === 'string') return `"${value}"`;
  return JSON.stringify(value);
}

export function ReviewPanel({
  allReviews,
  activeReview,
  onPublish,
  onOpenDetail,
  onCloseDetail,
  onCheck,
  onUncheck,
  onNavigate,
}: Props) {
  if (activeReview !== null) {
    return (
      <DetailView
        review={activeReview}
        onBack={onCloseDetail}
        onCheck={onCheck}
        onUncheck={onUncheck}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <ListView
      reviews={allReviews}
      onPublish={onPublish}
      onOpenDetail={onOpenDetail}
    />
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

interface ListViewProps {
  reviews: ReviewSummary[];
  onPublish: () => void;
  onOpenDetail: (frameId: string) => void;
}

function ListView({ reviews, onPublish, onOpenDetail }: ListViewProps) {
  return (
    <div style={s.panel}>
      <div style={s.listHeader}>
        <span style={s.listTitle}>Reviews</span>
        <button style={s.publishBtn} onClick={onPublish}>+ Publicar mudanças</button>
      </div>

      {reviews.length === 0 ? (
        <div style={s.emptyState}>
          <p style={s.emptyTitle}>Nenhum review publicado</p>
          <p style={s.emptyDesc}>
            Selecione um frame e clique em "Publicar mudanças" para criar um review para o dev.
          </p>
        </div>
      ) : (
        <div style={s.list}>
          {reviews.map((r) => {
            const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.pending;
            return (
              <button key={r.reviewId} style={s.reviewCard} onClick={() => onOpenDetail(r.frameId)}>
                <div style={s.cardTop}>
                  <span style={s.cardName}>{r.frameName}</span>
                  <span style={{ ...s.statusBadge, background: sc.bg, color: sc.text }}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>
                <div style={s.cardMeta}>
                  {r.pendingItems > 0 && (
                    <span style={s.pendingDot}>{r.pendingItems} pendente{r.pendingItems > 1 ? 's' : ''}</span>
                  )}
                  {r.pendingItems === 0 && r.status === 'done' && (
                    <span style={s.allDone}>Tudo revisado</span>
                  )}
                  <span style={s.metaSep}>·</span>
                  <span>{timeAgo(r.publishedAt)}</span>
                  <span style={s.metaSep}>·</span>
                  <span>por {r.publishedBy}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

interface DetailViewProps {
  review: FrameReview;
  onBack: () => void;
  onCheck: (reviewId: string, frameId: string, nodeId: string, diffType: string) => void;
  onUncheck: (reviewId: string, frameId: string, nodeId: string, diffType: string) => void;
  onNavigate: (frameId: string) => void;
}

function DetailView({ review, onBack, onCheck, onUncheck, onNavigate }: DetailViewProps) {
  const checkedCount = review.items.filter(i => i.checkedAt !== null).length;
  const totalCount = review.items.length;
  const pct = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);
  const sc = STATUS_COLORS[review.status] ?? STATUS_COLORS.pending;

  const grouped: Record<Severity, ReviewItem[]> = { high: [], medium: [], low: [] };
  for (const item of review.items) {
    grouped[item.diffResult.severity].push(item);
  }

  return (
    <div style={s.panel}>
      <div style={s.detailHeaderBar}>
        <button style={s.backBtn} onClick={onBack}>← Voltar</button>
      </div>

      <div style={s.detailInfo}>
        <div style={s.detailTitleRow}>
          <span style={s.detailFrameName}>{review.frameName}</span>
          <div style={s.detailActions}>
            <span style={{ ...s.statusBadge, background: sc.bg, color: sc.text }}>
              {STATUS_LABELS[review.status]}
            </span>
            <button style={s.navigateBtn} onClick={() => onNavigate(review.frameId)} title="Ver no Figma">
              ↗
            </button>
          </div>
        </div>
        <p style={s.detailMeta}>
          Publicado por {review.publishedBy} · {timeAgo(review.publishedAt)}
        </p>
      </div>

      <div style={s.progressSection}>
        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${pct}%` }} />
        </div>
        <span style={s.progressLabel}>{checkedCount}/{totalCount} itens revisados</span>
      </div>

      <div style={s.itemsContainer}>
        {SEVERITY_ORDER.map((sev) => {
          const items = grouped[sev];
          if (items.length === 0) return null;
          return (
            <div key={sev} style={s.severityGroup}>
              <div style={s.severityLabel}>{SEVERITY_LABELS[sev]}</div>
              {items.map((item) => (
                <ReviewItemRow
                  key={`${item.diffResult.nodeId}-${item.diffResult.type}`}
                  item={item}
                  reviewId={review.reviewId}
                  frameId={review.frameId}
                  onCheck={onCheck}
                  onUncheck={onUncheck}
                />
              ))}
            </div>
          );
        })}

        {totalCount === 0 && (
          <p style={s.emptyDesc}>Nenhuma mudança detectada neste review.</p>
        )}
      </div>
    </div>
  );
}

// ─── Review item row ──────────────────────────────────────────────────────────

interface RowProps {
  item: ReviewItem;
  reviewId: string;
  frameId: string;
  onCheck: (reviewId: string, frameId: string, nodeId: string, diffType: string) => void;
  onUncheck: (reviewId: string, frameId: string, nodeId: string, diffType: string) => void;
}

function ReviewItemRow({ item, reviewId, frameId, onCheck, onUncheck }: RowProps) {
  const { diffResult, checkedAt, checkedBy } = item;
  const isChecked = checkedAt !== null;
  const sevColors = SEVERITY_BADGE[diffResult.severity];

  function toggle() {
    if (isChecked) {
      onUncheck(reviewId, frameId, diffResult.nodeId, diffResult.type);
    } else {
      onCheck(reviewId, frameId, diffResult.nodeId, diffResult.type);
    }
  }

  return (
    <div style={{ ...s.itemRow, ...(isChecked ? s.itemRowChecked : {}) }}>
      <button style={s.checkbox} onClick={toggle} aria-pressed={isChecked}>
        {isChecked && <span style={s.checkmark}>✓</span>}
      </button>
      <div style={s.itemContent}>
        <div style={s.itemTop}>
          <span style={{ ...s.diffBadge, background: sevColors.bg, color: sevColors.text }}>
            {DIFF_LABELS[diffResult.type]}
          </span>
          <span style={{ ...s.itemName, ...(isChecked ? s.itemNameChecked : {}) }}>
            {diffResult.nodeName}
          </span>
        </div>
        {diffResult.type !== 'ADDED' && diffResult.type !== 'REMOVED' && (
          <div style={s.itemValues}>
            <span style={s.valBefore}>{formatValue(diffResult.before)}</span>
            <span style={s.valArrow}>→</span>
            <span style={s.valAfter}>{formatValue(diffResult.after)}</span>
          </div>
        )}
        {diffResult.type === 'ADDED' && (
          <div style={s.itemValues}><span style={s.valAfter}>adicionado</span></div>
        )}
        {diffResult.type === 'REMOVED' && (
          <div style={s.itemValues}><span style={s.valBefore}>removido</span></div>
        )}
        {isChecked && checkedBy && (
          <div style={s.checkedBy}>Revisado por {checkedBy}</div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px 8px',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1e1e1e',
  },
  publishBtn: {
    background: '#18a0fb',
    border: 'none',
    borderRadius: 5,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    padding: '6px 12px 12px',
    overflowY: 'auto',
  },
  reviewCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: '100%',
    padding: '10px',
    background: 'none',
    border: '1px solid #ebebeb',
    borderRadius: 7,
    cursor: 'pointer',
    textAlign: 'left',
    marginTop: 6,
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1e1e1e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: '#888',
    flexWrap: 'wrap' as const,
  },
  pendingDot: {
    color: '#e65100',
    fontWeight: 600,
  },
  allDone: {
    color: '#2e7d32',
    fontWeight: 600,
  },
  metaSep: {
    color: '#ccc',
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '2px 6px',
    borderRadius: 3,
    flexShrink: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '32px 20px',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e1e1e',
    margin: 0,
  },
  emptyDesc: {
    fontSize: 11,
    color: '#888',
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 260,
  },
  detailHeaderBar: {
    padding: '8px 12px 4px',
    flexShrink: 0,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    padding: '2px 0',
    fontSize: 11,
    fontWeight: 600,
    color: '#18a0fb',
    cursor: 'pointer',
  },
  detailInfo: {
    padding: '0 12px 8px',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  detailTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  detailFrameName: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1e1e1e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  detailActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  navigateBtn: {
    background: 'none',
    border: '1px solid #ddd',
    borderRadius: 4,
    padding: '2px 7px',
    fontSize: 11,
    color: '#555',
    cursor: 'pointer',
  },
  detailMeta: {
    fontSize: 10,
    color: '#888',
    margin: 0,
  },
  progressSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  progressBar: {
    flex: 1,
    height: 6,
    background: '#ebebeb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#18a0fb',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  progressLabel: {
    fontSize: 10,
    color: '#888',
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
  },
  itemsContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '6px 12px 12px',
  },
  severityGroup: {
    marginTop: 10,
  },
  severityLabel: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#aaa',
    padding: '4px 0 6px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 10px',
    border: '1px solid #ebebeb',
    borderRadius: 6,
    marginBottom: 4,
    background: '#fff',
  },
  itemRowChecked: {
    background: '#f9fdf9',
    borderColor: '#c8e6c9',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    border: '1.5px solid #ddd',
    background: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    marginTop: 1,
  },
  checkmark: {
    fontSize: 10,
    color: '#2e7d32',
    fontWeight: 700,
  },
  itemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  itemTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  diffBadge: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '2px 5px',
    borderRadius: 3,
    flexShrink: 0,
  },
  itemName: {
    fontSize: 11,
    fontWeight: 600,
    color: '#1e1e1e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  itemNameChecked: {
    textDecoration: 'line-through',
    color: '#aaa',
  },
  itemValues: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: '#666',
    flexWrap: 'wrap' as const,
  },
  valBefore: {
    color: '#c62828',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  valArrow: {
    color: '#999',
  },
  valAfter: {
    color: '#2e7d32',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  checkedBy: {
    fontSize: 9,
    color: '#2e7d32',
    fontStyle: 'italic',
  },
} satisfies Record<string, React.CSSProperties>;
