import { cn } from './utils'

export const DIFF_LABELS: Record<string, string> = {
  REMOVED:            '🗑 Removido',
  ADDED:              '✨ Adicionado',
  TEXT_CHANGED:       '✏️ Texto alterado',
  COLOR_CHANGED:      '🎨 Cor alterada',
  SIZE_CHANGED:       '📐 Tamanho alterado',
  POSITION_CHANGED:   '📍 Posição alterada',
  VISIBILITY_CHANGED: '👁 Visibilidade alterada',
  // legado (plugin v0.1)
  COLOR:      '🎨 Cor alterada',
  SIZE:       '📐 Tamanho alterado',
  TYPOGRAPHY: '✏️ Texto alterado',
  CONTENT:    '✏️ Conteúdo alterado',
  LAYOUT:     '📐 Layout alterado',
  POSITION:   '📍 Posição alterada',
  COMPONENT:  '🔄 Componente alterado',
}

export function diffLabel(type: string): string {
  return DIFF_LABELS[type] ?? '🔄 Alterado'
}

function isRgb(v: unknown): v is { r: number; g: number; b: number } {
  return typeof v === 'object' && v !== null && 'r' in v && 'g' in v && 'b' in v
}
function isSize(v: unknown): v is { width: number; height: number } {
  return typeof v === 'object' && v !== null && 'width' in v && 'height' in v
}
function isPosition(v: unknown): v is { x: number; y: number } {
  return typeof v === 'object' && v !== null && 'x' in v && 'y' in v
}
function toHex(channel: number): string {
  const v = channel <= 1 ? Math.round(channel * 255) : Math.round(channel)
  return v.toString(16).padStart(2, '0')
}

interface ValueBadgeProps {
  value: unknown
  variant: 'before' | 'after'
}

export function ValueBadge({ value, variant }: ValueBadgeProps) {
  const base = variant === 'before'
    ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'

  if (value === null || value === undefined) {
    return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
  }

  if (isRgb(value)) {
    const hex = `#${toHex(value.r)}${toHex(value.g)}${toHex(value.b)}`
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs font-mono', base)}>
        <span
          className="w-3 h-3 rounded-sm border border-black/10 dark:border-white/10 shrink-0"
          style={{ background: hex }}
        />
        {hex}
      </span>
    )
  }

  if (isSize(value)) {
    return (
      <span className={cn('px-1.5 py-0.5 rounded text-xs font-mono', base)}>
        {Math.round(value.width)}×{Math.round(value.height)}
      </span>
    )
  }

  if (isPosition(value)) {
    return (
      <span className={cn('px-1.5 py-0.5 rounded text-xs font-mono', base)}>
        x: {Math.round(value.x)}, y: {Math.round(value.y)}
      </span>
    )
  }

  const text = typeof value === 'string'
    ? `"${value.slice(0, 38)}"`
    : String(value).slice(0, 40)

  return (
    <span className={cn('px-1.5 py-0.5 rounded text-xs font-mono', base)}>
      {text}
    </span>
  )
}
