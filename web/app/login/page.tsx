'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://handoff-api.onrender.com'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (mode === 'register' && password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'register'
            ? { type: 'register', email, password, name }
            : { type: 'login', email, password }
        ),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        const msg = data.error ?? 'Erro ao autenticar'
        const friendly =
          res.status === 409 ? 'Email já cadastrado' :
          res.status === 401 ? 'Email ou senha incorretos' :
          msg
        setError(friendly)
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="1" y="1" width="11" height="11" rx="2" fill="#18a0fb" />
                <rect x="16" y="1" width="11" height="11" rx="2" fill="#18a0fb" opacity="0.4" />
                <rect x="1" y="16" width="11" height="11" rx="2" fill="#18a0fb" opacity="0.4" />
                <rect x="16" y="16" width="11" height="11" rx="2" fill="#18a0fb" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">Handoff</span>
          </div>

          <p className="text-sm text-gray-500 text-center leading-relaxed -mt-2">
            {mode === 'login' ? 'Entrar no Handoff' : 'Criar sua conta'}
          </p>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
            {mode === 'register' && (
              <input
                type="text"
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'register' ? 8 : 1}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors"
            />
            {mode === 'register' && (
              <input
                type="password"
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors"
              />
            )}

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <button
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs text-blue-600 hover:underline -mt-2"
          >
            {mode === 'login' ? 'Criar conta' : 'Já tenho conta'}
          </button>

          {/* Separator */}
          <div className="w-full flex items-center gap-3">
            <hr className="flex-1 border-gray-200" />
            <span className="text-xs text-gray-400">ou</span>
            <hr className="flex-1 border-gray-200" />
          </div>

          {/* Figma login */}
          <a
            href={`${API_URL}/auth/figma`}
            className="w-full flex items-center justify-center gap-2 bg-[#18a0fb] hover:bg-[#0d8de8] text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 38 57" fill="currentColor">
              <path d="M19 28.5A9.5 9.5 0 1 1 28.5 19 9.5 9.5 0 0 1 19 28.5z"/>
              <path d="M9.5 57A9.5 9.5 0 0 1 9.5 38h9.5v9.5A9.5 9.5 0 0 1 9.5 57z"/>
              <path d="M0 28.5A9.5 9.5 0 0 1 9.5 19H19v19H9.5A9.5 9.5 0 0 1 0 28.5z"/>
              <path d="M0 9.5A9.5 9.5 0 0 1 9.5 0H19v19H9.5A9.5 9.5 0 0 1 0 9.5z"/>
              <path d="M19 0h9.5a9.5 9.5 0 0 1 0 19H19z"/>
            </svg>
            Entrar com Figma
          </a>

          <p className="text-xs text-gray-400 -mt-2">Feito para times de produto</p>
        </div>
      </div>
    </main>
  )
}
