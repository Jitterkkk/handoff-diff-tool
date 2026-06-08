'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  reviewId: string
}

export function ReviewCardActions({ reviewId }: Props) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirming(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleArchive() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reviews/${reviewId}/archive`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Falha ao arquivar')
      window.location.href = '/dashboard/reviews'
    } catch (err) {
      alert(String(err))
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao excluir')
      window.location.href = '/dashboard/reviews'
    } catch (err) {
      alert(String(err))
      setLoading(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); setConfirming(false) }}
        disabled={loading}
        aria-label="Ações"
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-base leading-none"
      >
        ···
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg z-10 overflow-hidden">
          <button
            onClick={handleArchive}
            disabled={loading}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Arquivar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
              confirming
                ? 'text-white bg-red-500 hover:bg-red-600'
                : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`}
          >
            {confirming ? 'Confirmar exclusão' : 'Excluir'}
          </button>
        </div>
      )}
    </div>
  )
}
