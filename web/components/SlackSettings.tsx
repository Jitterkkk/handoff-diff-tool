'use client'

import { useState } from 'react'

interface Props {
  initialIntegration: { webhookUrl: string; enabled: boolean } | null
}

export function SlackSettings({ initialIntegration }: Props) {
  const [integration, setIntegration] = useState(initialIntegration)
  const [webhookInput, setWebhookInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')
  const [testing, setTesting] = useState(false)
  const [testFeedback, setTestFeedback] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const maskedUrl = integration
    ? `···${integration.webhookUrl.slice(-8)}`
    : null

  async function handleSave() {
    if (!webhookInput.trim()) return
    setSaving(true)
    setSaveFeedback('')
    try {
      const res = await fetch('/api/slack/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookInput }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; issues?: { message: string }[] }
        const msg = data.issues?.[0]?.message ?? data.error ?? 'Não foi possível salvar'
        setSaveFeedback(`Erro: ${msg}`)
      } else {
        setIntegration({ webhookUrl: webhookInput, enabled: true })
        setWebhookInput('')
        setSaveFeedback('Webhook salvo!')
        setTimeout(() => setSaveFeedback(''), 3000)
      }
    } catch {
      setSaveFeedback('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestFeedback('')
    try {
      const res = await fetch('/api/slack/test', { method: 'POST' })
      const data = await res.json().catch(() => ({})) as { success?: boolean; error?: string }
      setTestFeedback(data.success ? 'Mensagem enviada!' : 'Erro ao enviar')
    } catch {
      setTestFeedback('Erro ao enviar')
    } finally {
      setTesting(false)
      setTimeout(() => setTestFeedback(''), 4000)
    }
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setDeleting(true)
    try {
      await fetch('/api/slack/webhook', { method: 'DELETE' })
      setIntegration(null)
      setWebhookInput('')
      setConfirmingDelete(false)
    } catch {
      // silent
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">💬</span>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Notificações Slack</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        Receba uma mensagem no Slack quando um review for publicado.
      </p>
      <a
        href="https://api.slack.com/messaging/webhooks"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mb-5 inline-block"
      >
        Como criar um Incoming Webhook →
      </a>

      {integration && (
        <div className="flex items-center justify-between gap-3 mb-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-green-700 dark:text-green-400">Webhook configurado</p>
            <p className="text-xs text-green-600 dark:text-green-500 font-mono mt-0.5 truncate">{maskedUrl}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleTest}
              disabled={testing}
              className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500 transition-colors disabled:opacity-50"
            >
              {testing ? 'Enviando…' : 'Testar'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                confirmingDelete
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-red-500 dark:text-red-400 hover:border-red-300 dark:hover:border-red-700'
              }`}
            >
              {deleting ? 'Removendo…' : confirmingDelete ? 'Confirmar remoção' : 'Remover'}
            </button>
          </div>
        </div>
      )}

      {testFeedback && (
        <p className={`text-xs mb-3 ${testFeedback.includes('Erro') ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {testFeedback}
        </p>
      )}

      <div className="flex gap-2">
        <input
          type="url"
          value={webhookInput}
          onChange={e => {
            setWebhookInput(e.target.value)
            if (confirmingDelete) setConfirmingDelete(false)
          }}
          placeholder={
            integration
              ? 'Cole um novo URL para substituir…'
              : 'https://hooks.slack.com/services/…'
          }
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
        />
        <button
          onClick={handleSave}
          disabled={saving || !webhookInput.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {saveFeedback && (
        <p className={`text-xs mt-2 ${saveFeedback.startsWith('Erro') ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {saveFeedback}
        </p>
      )}
    </div>
  )
}
