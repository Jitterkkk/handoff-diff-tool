'use client'

import { useTransition } from 'react'
import { cn } from '@/lib/utils'
import type { ReviewItem, Severity } from '@/lib/types'
import { toggleReviewItem } from '@/app/actions'

const DIFF_ICONS: Record<string, string> = {
  COLOR: '🎨',
  SIZE: '⇔',
  TYPOGRAPHY: 'T',
  CONTENT: '✏',
  ADDED: '+',
  REMOVED: '−',
  COMPONENT: '◈',
  LAYOUT: '⊞',
  POSITION: '↖',
}

const SEVERITY_COLORS: Record<Severity, string> = {
  high: 'text-red-500',
  medium: 'text-yellow-500',
  low: 'text-gray-400',
}

interface Props {
  item: ReviewItem
  reviewId: string
}

export function DiffItemRow({ item, reviewId }: Props) {
  const [isPending, startTransition] = useTransition()
  const isChecked = item.checked_at !== null

  function handleToggle() {
    startTransition(async () => {
      await toggleReviewItem(reviewId, item.id, !isChecked)
    })
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg border transition-all',
        isChecked ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100',
        isPending && 'opacity-60',
      )}
    >
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          'w-5 h-5 mt-0.5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors',
          isChecked
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-green-400',
        )}
      >
        {isChecked && <span className="text-[10px] leading-none">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs font-mono', SEVERITY_COLORS[item.severity])}>
            {DIFF_ICONS[item.diff_type] ?? '•'}
          </span>
          <span className={cn('text-sm font-medium text-gray-800', isChecked && 'line-through text-gray-400')}>
            {item.node_name}
          </span>
          <span className="text-xs text-gray-400 uppercase tracking-wide">{item.diff_type.toLowerCase()}</span>
        </div>

        {(item.before_value !== null || item.after_value !== null) && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 font-mono">
            {item.before_value !== null && (
              <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                {String(item.before_value).slice(0, 40)}
              </span>
            )}
            {item.before_value !== null && item.after_value !== null && (
              <span className="text-gray-300">→</span>
            )}
            {item.after_value !== null && (
              <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                {String(item.after_value).slice(0, 40)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
