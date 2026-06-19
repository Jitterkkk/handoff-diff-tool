'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WorkspaceWithRole, ReviewSummary, WorkspaceMember } from '@/lib/types'
import { ReviewsListClient } from './ReviewsListClient'

interface Props {
  workspace: WorkspaceWithRole
  initialReviews: ReviewSummary[]
  initialMembers: WorkspaceMember[]
  currentUserId: string
}

export function WorkspaceDetailClient({ workspace, initialReviews, initialMembers, currentUserId }: Props) {
  const router = useRouter()
  const isOwner = workspace.role === 'owner'

  // Invite
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Members
  const [members, setMembers] = useState<WorkspaceMember[]>(initialMembers)
  const [memberOps, setMemberOps] = useState<Record<string, boolean>>({})

  // Slack
  const [slackWebhook, setSlackWebhook] = useState('')
  const [savingSlack, setSavingSlack] = useState(false)
  const [slackMsg, setSlackMsg] = useState('')

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleInvite() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/invite`, { method: 'POST' })
      const data = await res.json() as { url?: string }
      if (data.url) setInviteUrl(data.url)
    } catch { /* ignore */ } finally {
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

  async function handleRemove(memberId: string) {
    setMemberOps(prev => ({ ...prev, [memberId]: true }))
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/members/${memberId}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setMembers(prev => prev.filter(m => m.id !== memberId))
      }
    } catch { /* ignore */ } finally {
      setMemberOps(prev => { const n = { ...prev }; delete n[memberId]; return n })
    }
  }

  async function handleRoleChange(memberId: string, role: 'owner' | 'member') {
    setMemberOps(prev => ({ ...prev, [memberId]: true }))
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m))
      }
    } catch { /* ignore */ } finally {
      setMemberOps(prev => { const n = { ...prev }; delete n[memberId]; return n })
    }
  }

  async function handleSaveSlack(e: React.FormEvent) {
    e.preventDefault()
    if (!slackWebhook.startsWith('https://hooks.slack.com/')) {
      setSlackMsg('URL inválida. Use https://hooks.slack.com/...')
      return
    }
    setSavingSlack(true)
    setSlackMsg('')
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/slack`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: slackWebhook }),
      })
      setSlackMsg(res.ok ? 'Webhook salvo!' : 'Erro ao salvar')
    } catch {
      setSlackMsg('Erro de conexão')
    } finally {
      setSavingSlack(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch { /* ignore */ } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Header */}
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

      {/* Reviews */}
      {initialReviews.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          Nenhum review publicado neste projeto ainda.
        </div>
      ) : (
        <ReviewsListClient initialReviews={initialReviews} />
      )}

      {/* Members */}
      <div className="mt-10">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Membros</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {members.map(member => {
            const isSelf = member.id === currentUserId
            const busy = !!memberOps[member.id]
            return (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {member.name}{isSelf && <span className="text-xs text-gray-400 ml-1">(você)</span>}
                  </p>
                  {member.email && (
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                  member.role === 'owner'
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {member.role === 'owner' ? 'Owner' : 'Membro'}
                </span>
                {isOwner && !isSelf && (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as 'owner' | 'member')}
                      disabled={busy}
                      className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40"
                    >
                      <option value="member">Membro</option>
                      <option value="owner">Owner</option>
                    </select>
                    <button
                      onClick={() => handleRemove(member.id)}
                      disabled={busy}
                      className="text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors text-base leading-none shrink-0"
                      title="Remover membro"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Slack (owner only) */}
      {isOwner && (
        <div className="mt-6 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Notificações Slack</h2>
          <p className="text-xs text-gray-400 mb-3">
            Reviews publicados neste projeto notificam este canal
          </p>
          <form onSubmit={handleSaveSlack} className="flex gap-2">
            <input
              type="url"
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="flex-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 min-w-0"
            />
            <button
              type="submit"
              disabled={savingSlack}
              className="text-xs bg-gray-900 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white px-3 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors shrink-0"
            >
              {savingSlack ? '...' : 'Salvar'}
            </button>
          </form>
          {slackMsg && (
            <p className={`text-xs mt-1.5 ${slackMsg.includes('salvo') ? 'text-green-600' : 'text-red-500'}`}>
              {slackMsg}
            </p>
          )}
        </div>
      )}

      {/* Danger zone (owner only) */}
      {isOwner && (
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-400 hover:text-red-500 transition-colors"
            >
              Deletar projeto
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-red-500 font-medium">
                Tem certeza? Isso não pode ser desfeito.
              </span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                {deleting ? 'Deletando...' : 'Confirmar exclusão'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
