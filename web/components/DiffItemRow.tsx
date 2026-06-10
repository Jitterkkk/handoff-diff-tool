'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { diffLabel, BeforeAfterPreview, FigmaLink } from '@/lib/diffFormatters'
import type { ReviewItem } from '@/lib/types'
import { toggleReviewItem } from '@/app/actions'

interface Props {
  item: ReviewItem
  reviewId: string
  fileKey?: string
}

export function DiffItemRow({ item, reviewId, fileKey }: Props) {
  const [isPending, startTransition] = useTransition()
  const [confirmingComment, setConfirmingComment] = useState(false)
  const [commentText, setCommentText] = useState('')
  const isChecked = item.checked_at !== null

  function handleCheckboxClick() {
    if (isChecked) {
      startTransition(async () => {
        await toggleReviewItem(reviewId, item.id, false)
      })
    } else {
      setConfirmingComment(true)
      setCommentText('')
    }
  }

  function handleConfirm() {
    const comment = commentText.trim() || undefined
    setConfirmingComment(false)
    setCommentText('')
    startTransition(async () => {
      await toggleReviewItem(reviewId, item.id, true, comment)
    })
  }

  function handleSkip() {
    setConfirmingComment(false)
    setCommentText('')
    startTransition(async () => {
      await toggleReviewItem(reviewId, item.id, true)
    })
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg border transition-all',
        isChecked
          ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30'
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
        isPending && 'opacity-60',
      )}
    >
      <button
        onClick={handleCheckboxClick}
        disabled={isPending || confirmingComment}
        className="-m-1 p-1 shrink-0 mt-0.5"
        aria-label={isChecked ? 'Desmarcar item' : 'Marcar como revisado'}
      >
        <span className={cn(
          'w-5 h-5 rounded flex items-center justify-center border-2 transition-colors',
          isChecked
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500',
        )}>
          {isChecked && <span className="text-[10px] leading-none">✓</span>}
        </span>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className={cn(
              'text-sm font-semibold text-gray-900 dark:text-gray-100',
              isChecked && 'line-through text-gray-400 dark:text-gray-600',
            )}>
              {item.node_name.replace(/^[\s–\-]+/, '')}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {diffLabel(item.diff_type)}
            </span>
            {isChecked && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">· Revisado</span>
            )}
          </div>
          <FigmaLink fileKey={fileKey} nodeId={item.node_id} />
        </div>

        <BeforeAfterPreview
          diffType={item.diff_type}
          beforeValue={item.before_value}
          afterValue={item.after_value}
          nodeName={item.node_name.replace(/^[\s–\-]+/, '')}
        />

        {confirmingComment && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Deixe uma nota opcional (ex: ajustei o padding)..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={handleSkip}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Pular
              </button>
            </div>
          </div>
        )}

        {!confirmingComment && item.comment && (
          <p className="mt-1.5 text-xs italic text-gray-400 dark:text-gray-500">
            💬 &ldquo;{item.comment}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}
