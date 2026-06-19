'use client'

import { useState } from 'react'
import type { WorkspaceWithRole, ReviewSummary } from '@/lib/types'
import { ReviewsListClient } from './ReviewsListClient'

interface Props {
  workspace: WorkspaceWithRole
  initialReviews: ReviewSummary[]
}

export function WorkspaceDetailClient({ workspace, initialReviews }: Props) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleInvite() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/invite`, { method: 'POST' })
      const data = await res.json() as { url?: string }
      if (data.url) setInviteUrl(data.url)
    } catch {
      // ignore
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy() {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{workspace.name}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {workspace.memberCount} membro{workspace.memberCount !== 1 ? 's' : ''}
            {' · '}
            {initialReviews.length} review{initialReviews.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {inviteUrl ? (
            <>
              <input
                readOnly
                value={inviteUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 w-56 font-mono text-gray-600 dark:text-gray-300"
              />
              <button
                onClick={handleCopy}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </>
          ) : (
            <button
              onClick={handleInvite}
              disabled={generating}
              className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {generating ? 'Gerando...' : 'Convidar'}
            </button>
          )}
        </div>
      </div>

      {initialReviews.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nenhum review publicado neste projeto ainda.
        </div>
      ) : (
        <ReviewsListClient initialReviews={initialReviews} />
      )}
    </>
  )
}
