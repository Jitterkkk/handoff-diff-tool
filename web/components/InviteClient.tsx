'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  token: string
  workspaceName: string
}

export function InviteClient({ token, workspaceName }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'accept' | 'login' | 'register'>('accept')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function joinWorkspace(): Promise<string | null> {
    const res = await fetch(`/api/workspaces/join/${token}`, { method: 'POST' })
    const data = await res.json() as { id?: string; requiresAuth?: boolean }
    if (data.requiresAuth) {
      setMode('login')
      return null
    }
    return data.id ?? null
  }

  async function handleAccept() {
    setLoading(true)
    try {
      const id = await joinWorkspace()
      if (id) router.push(`/dashboard/workspaces/${id}`)
    } catch {
      setError('Erro ao aceitar convite')
    } finally {
      setLoading(false)
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const authRes = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'register'
            ? { type: 'register', email, password, name }
            : { type: 'login', email, password }
        ),
      })
      if (!authRes.ok) {
        const d = await authRes.json() as { error?: string }
        setError(d.error ?? 'Erro ao autenticar')
        return
      }
      const id = await joinWorkspace()
      if (id) router.push(`/dashboard/workspaces/${id}`)
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const FigmaLogo = () => (
    <svg width="16" height="16" viewBox="0 0 38 57" fill="currentColor">
      <path d="M19 28.5A9.5 9.5 0 1 1 28.5 19 9.5 9.5 0 0 1 19 28.5z"/>
      <path d="M9.5 57A9.5 9.5 0 0 1 9.5 38h9.5v9.5A9.5 9.5 0 0 1 9.5 57z"/>
      <path d="M0 28.5A9.5 9.5 0 0 1 9.5 19H19v19H9.5A9.5 9.5 0 0 1 0 28.5z"/>
      <path d="M0 9.5A9.5 9.5 0 0 1 9.5 0H19v19H9.5A9.5 9.5 0 0 1 0 9.5z"/>
      <path d="M19 0h9.5a9.5 9.5 0 0 1 0 19H19z"/>
    </svg>
  )

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://handoff-api.onrender.com'

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col gap-5">
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Convite para</p>
            <h1 className="text-xl font-bold text-gray-900">{workspaceName}</h1>
          </div>

          {mode === 'accept' && (
            <>
              <p className="text-sm text-gray-500 text-center">
                Você foi convidado para colaborar neste projeto.
              </p>
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              <button
                onClick={handleAccept}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {loading ? 'Entrando...' : 'Aceitar convite'}
              </button>
              <div className="flex items-center gap-3">
                <hr className="flex-1 border-gray-200" />
                <span className="text-xs text-gray-400">ou</span>
                <hr className="flex-1 border-gray-200" />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setMode('login')}
                  className="w-full py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl text-sm transition-colors"
                >
                  Entrar com email
                </button>
                <a
                  href={`${API_URL}/auth/figma`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl text-sm transition-colors"
                >
                  <FigmaLogo />
                  Entrar com Figma
                </a>
              </div>
            </>
          )}

          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleAuth} className="flex flex-col gap-3">
              {mode === 'register' && (
                <input
                  type="text"
                  placeholder="Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
              />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {loading ? 'Aguarde...' : mode === 'register' ? 'Criar conta e entrar' : 'Entrar no projeto'}
              </button>
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-xs text-blue-600 hover:underline text-center"
              >
                {mode === 'login' ? 'Criar conta' : 'Já tenho conta'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('accept'); setError('') }}
                className="text-xs text-gray-400 hover:text-gray-600 text-center"
              >
                ← Voltar
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
