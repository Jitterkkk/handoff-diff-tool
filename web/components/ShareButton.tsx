'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  reviewId: string
  className?: string
}

export function ShareButton({ reviewId, className }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}/review/${reviewId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium transition-colors',
        copied
          ? 'text-green-600'
          : 'text-gray-400 hover:text-gray-600',
        className,
      )}
    >
      {copied ? (
        <>
          <span>✓</span>
          <span>Copiado!</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>Copiar link</span>
        </>
      )}
    </button>
  )
}
