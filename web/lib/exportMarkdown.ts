import { diffLabel, isRgb, isSize, isPosition, valueToHex } from './diffFormatters'
import type { ReviewDetail, ReviewItem, ReviewStatus } from './types'

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  done: 'Concluído',
}

const SEVERITY_HEADINGS = {
  high: 'Alta prioridade',
  medium: 'Média prioridade',
  low: 'Baixa prioridade',
} as const

function formatValueMd(v: unknown): string {
  if (isRgb(v)) return valueToHex(v)
  if (isSize(v)) return `${Math.round(v.width)}×${Math.round(v.height)}`
  if (isPosition(v)) return `x: ${Math.round(v.x)}, y: ${Math.round(v.y)}`
  if (typeof v === 'string') return v.slice(0, 120)
  return String(v).slice(0, 120)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function itemLine(item: ReviewItem): string {
  const check = item.checked_at !== null ? 'x' : ' '
  const label = diffLabel(item.diff_type)
  const name = item.node_name.replace(/^[\s–\-]+/, '')
  const lines: string[] = [`- [${check}] ${label} — \`${name}\``]

  if (item.comment) {
    lines.push(`  > ${item.comment}`)
  }

  const type = item.diff_type.toUpperCase()
  const hasBefore = item.before_value != null
  const hasAfter = item.after_value != null
  const skipValues = type === 'REMOVED' || type === 'ADDED'
  if (!skipValues && (hasBefore || hasAfter)) {
    const before = hasBefore ? formatValueMd(item.before_value) : '—'
    const after = hasAfter ? formatValueMd(item.after_value) : '—'
    lines.push(`  > Antes: ${before} → Depois: ${after}`)
  }

  return lines.join('\n')
}

export function generateMarkdown(review: ReviewDetail): string {
  const lines: string[] = []

  lines.push(`# Review: ${review.frame_name}`)
  lines.push('')
  lines.push(`**Arquivo:** ${review.file_name}`)
  lines.push(`**Publicado por:** ${review.published_by_name}`)
  lines.push(`**Data:** ${formatDate(review.published_at)}`)
  lines.push(`**Status:** ${STATUS_LABELS[review.status]}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  const bySeverity = {
    high: review.items.filter(i => i.severity === 'high'),
    medium: review.items.filter(i => i.severity === 'medium'),
    low: review.items.filter(i => i.severity === 'low'),
  }

  for (const sev of ['high', 'medium', 'low'] as const) {
    const items = bySeverity[sev]
    if (items.length === 0) continue
    const count = items.length
    lines.push(`## ${SEVERITY_HEADINGS[sev]} (${count} ${count === 1 ? 'item' : 'itens'})`)
    lines.push('')
    for (const item of items) {
      lines.push(itemLine(item))
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('*Gerado pelo Handoff Diff Tool — handoff-diff-tool.vercel.app*')

  return lines.join('\n')
}
