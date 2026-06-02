import { cn } from './utils'

// ── Mapa de tipos de diff → label em português ────────────────────────────────
export const DIFF_LABELS: Record<string, string> = {
  REMOVED:            '🗑 Removido',
  ADDED:              '✨ Adicionado',
  TEXT_CHANGED:       '✏️ Texto alterado',
  COLOR_CHANGED:      '🎨 Cor alterada',
  SIZE_CHANGED:       '📐 Tamanho alterado',
  POSITION_CHANGED:   '📍 Posição alterada',
  VISIBILITY_CHANGED: '👁 Visibilidade alterada',
  // legado plugin v0.1
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

// ── Helpers de tipo ───────────────────────────────────────────────────────────
export function isRgb(v: unknown): v is { r: number; g: number; b: number } {
  return typeof v === 'object' && v !== null && 'r' in v && 'g' in v && 'b' in v
}
export function isSize(v: unknown): v is { width: number; height: number } {
  return typeof v === 'object' && v !== null && 'width' in v && 'height' in v
}
export function isPosition(v: unknown): v is { x: number; y: number } {
  return typeof v === 'object' && v !== null && 'x' in v && 'y' in v
}
export function toHex(channel: number): string {
  const v = channel <= 1 ? Math.round(channel * 255) : Math.round(channel)
  return v.toString(16).padStart(2, '0')
}
export function valueToHex(v: { r: number; g: number; b: number }): string {
  return `#${toHex(v.r)}${toHex(v.g)}${toHex(v.b)}`
}

// ── ValueBadge — badge inline compacto ───────────────────────────────────────
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
    const hex = valueToHex(value)
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs font-mono', base)}>
        <span className="w-3 h-3 rounded-sm border border-black/10 dark:border-white/10 shrink-0" style={{ background: hex }} />
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

// ── BeforeAfterPreview — visualização rica por tipo de diff ───────────────────
interface PreviewProps {
  diffType: string
  beforeValue: unknown
  afterValue: unknown
  nodeName: string
}

export function BeforeAfterPreview({ diffType, beforeValue, afterValue, nodeName }: PreviewProps) {
  const type = diffType.toUpperCase()

  // REMOVED
  if (type === 'REMOVED') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg">
        <span className="text-red-500 shrink-0">🗑</span>
        <span className="text-xs text-red-700 dark:text-red-400">
          Elemento removido: <strong>{nodeName}</strong>
        </span>
      </div>
    )
  }

  // ADDED
  if (type === 'ADDED') {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-lg">
        <span className="text-green-500 shrink-0">✨</span>
        <span className="text-xs text-green-700 dark:text-green-400">
          Elemento adicionado: <strong>{nodeName}</strong>
        </span>
      </div>
    )
  }

  // TEXT_CHANGED / TYPOGRAPHY / CONTENT
  if (['TEXT_CHANGED', 'TYPOGRAPHY', 'CONTENT'].includes(type)) {
    const before = beforeValue != null ? String(beforeValue) : null
    const after  = afterValue  != null ? String(afterValue)  : null
    if (!before && !after) return null
    return (
      <div className="mt-2 flex flex-col gap-1.5">
        {before && (
          <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg">
            <p className="text-[10px] text-red-400 dark:text-red-500 uppercase font-semibold tracking-wide mb-0.5">Antes</p>
            <p className="text-xs text-red-700 dark:text-red-300 line-through leading-relaxed">{before.slice(0, 160)}</p>
          </div>
        )}
        {after && (
          <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-lg">
            <p className="text-[10px] text-green-400 dark:text-green-500 uppercase font-semibold tracking-wide mb-0.5">Depois</p>
            <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">{after.slice(0, 160)}</p>
          </div>
        )}
      </div>
    )
  }

  // COLOR_CHANGED / COLOR
  if (['COLOR_CHANGED', 'COLOR'].includes(type)) {
    if (!isRgb(beforeValue) && !isRgb(afterValue)) {
      // fallback para ValueBadge
      return (
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <ValueBadge value={beforeValue} variant="before" />
          <span className="text-gray-300 dark:text-gray-600 text-xs">→</span>
          <ValueBadge value={afterValue} variant="after" />
        </div>
      )
    }
    const hexBefore = isRgb(beforeValue) ? valueToHex(beforeValue) : null
    const hexAfter  = isRgb(afterValue)  ? valueToHex(afterValue)  : null
    return (
      <div className="mt-2 flex items-end gap-4">
        {hexBefore && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-lg border border-black/10 dark:border-white/10 shadow-sm" style={{ background: hexBefore }} />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{hexBefore}</span>
            <span className="text-[9px] text-red-400 uppercase font-semibold tracking-wide">Antes</span>
          </div>
        )}
        {hexBefore && hexAfter && (
          <span className="text-gray-300 dark:text-gray-600 text-base mb-7">→</span>
        )}
        {hexAfter && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-lg border border-black/10 dark:border-white/10 shadow-sm" style={{ background: hexAfter }} />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{hexAfter}</span>
            <span className="text-[9px] text-green-400 uppercase font-semibold tracking-wide">Depois</span>
          </div>
        )}
      </div>
    )
  }

  // SIZE_CHANGED / SIZE
  if (['SIZE_CHANGED', 'SIZE'].includes(type)) {
    if (!isSize(beforeValue) && !isSize(afterValue)) {
      return (
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <ValueBadge value={beforeValue} variant="before" />
          <span className="text-gray-300 dark:text-gray-600 text-xs">→</span>
          <ValueBadge value={afterValue} variant="after" />
        </div>
      )
    }
    const MAX_DIM = 72
    const maxDim = Math.max(
      isSize(beforeValue) ? Math.max(beforeValue.width, beforeValue.height) : 0,
      isSize(afterValue)  ? Math.max(afterValue.width,  afterValue.height)  : 0,
    )
    const scale = maxDim > 0 ? MAX_DIM / maxDim : 1

    function sizeBox(val: { width: number; height: number }, label: string, color: string) {
      const w = Math.max(Math.round(val.width  * scale), 12)
      const h = Math.max(Math.round(val.height * scale), 12)
      return (
        <div className="flex flex-col items-center gap-1">
          <div className={cn('rounded border flex items-center justify-center', color)} style={{ width: w, height: h }} />
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono tabular-nums">
            {Math.round(val.width)}×{Math.round(val.height)}
          </span>
          <span className={cn('text-[9px] uppercase font-semibold tracking-wide', label === 'Antes' ? 'text-red-400' : 'text-green-400')}>
            {label}
          </span>
        </div>
      )
    }

    return (
      <div className="mt-2 flex items-end gap-4">
        {isSize(beforeValue) && sizeBox(beforeValue, 'Antes', 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500')}
        {isSize(beforeValue) && isSize(afterValue) && (
          <span className="text-gray-300 dark:text-gray-600 text-base mb-7">→</span>
        )}
        {isSize(afterValue) && sizeBox(afterValue, 'Depois', 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700')}
      </div>
    )
  }

  // Fallback genérico — ValueBadge
  if (beforeValue == null && afterValue == null) return null
  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      <ValueBadge value={beforeValue} variant="before" />
      <span className="text-gray-300 dark:text-gray-600 text-xs">→</span>
      <ValueBadge value={afterValue} variant="after" />
    </div>
  )
}
