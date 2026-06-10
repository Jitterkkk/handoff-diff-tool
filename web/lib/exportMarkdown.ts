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

export function formatValueMd(v: unknown): string | null {
  if (v === null || v === undefined) return null

  // Tenta parsear se for string JSON
  let parsed: unknown = v
  if (typeof v === 'string') {
    try {
      parsed = JSON.parse(v)
    } catch {
      return v || null
    }
  }

  // Array (ex: fills) → pega o primeiro elemento
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return null
    return formatValueMd(parsed[0])
  }

  // Objeto com color (fill Figma) → extrai a cor recursivamente
  if (typeof parsed === 'object' && parsed !== null) {
    const p = parsed as Record<string, unknown>
    if ('color' in p && typeof p.color === 'object') {
      return formatValueMd(p.color)
    }
  }

  // Tipos estruturados após parse
  if (isRgb(parsed)) return valueToHex(parsed)
  if (isSize(parsed)) return `${Math.round(parsed.width)}×${Math.round(parsed.height)}`
  if (isPosition(parsed)) return `x: ${Math.round(parsed.x)}, y: ${Math.round(parsed.y)}`

  const str = String(parsed)
  return str || null
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
  const skipValues = type === 'REMOVED' || type === 'ADDED'
  if (!skipValues) {
    const before = item.before_value != null ? formatValueMd(item.before_value) : null
    const after = item.after_value != null ? formatValueMd(item.after_value) : null
    if (before !== null || after !== null) {
      lines.push(`  > Antes: ${before ?? '—'} → Depois: ${after ?? '—'}`)
    }
  }

  return lines.join('\n')
}

export function generateMarkdown(review: ReviewDetail): string {
  const lines: string[] = []

  lines.push(`# Review: ${review.frame_name}`)
  lines.push('')
  lines.push(`**Arquivo:** ${review.file_name || review.file_key || 'Não informado'}`)
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
