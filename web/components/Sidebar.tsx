'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'
import type { WorkspaceWithRole } from '@/lib/types'

const navItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: '◻' },
  { href: '/dashboard/reviews', label: 'Reviews', icon: '◈' },
  { href: '/dashboard/files', label: 'Arquivos', icon: '⊞' },
  { href: '/dashboard/settings', label: 'Configurações', icon: '⚙' },
]

interface Props {
  userName: string
  workspaces: WorkspaceWithRole[]
}

export function Sidebar({ userName, workspaces }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  function handleLogout() {
    document.cookie = 'handoff_token=; max-age=0; path=/'
    router.push('/login')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (res.ok) {
        setNewName('')
        setCreating(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="w-60 shrink-0 bg-gray-950 text-white flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10 shrink-0">
        <div className="w-7 h-7 flex items-center justify-center shrink-0">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="0.5" y="0.5" width="9" height="9" rx="2" fill="#18a0fb" />
            <rect x="12.5" y="0.5" width="9" height="9" rx="2" fill="#18a0fb" opacity="0.4" />
            <rect x="0.5" y="12.5" width="9" height="9" rx="2" fill="#18a0fb" opacity="0.4" />
            <rect x="12.5" y="12.5" width="9" height="9" rx="2" fill="#18a0fb" />
          </svg>
        </div>
        <span className="font-bold text-base tracking-tight">Handoff</span>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {/* Projetos */}
        <div className="mb-1">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Projetos</span>
            <button
              onClick={() => { setCreating(v => !v); setNewName('') }}
              className="text-gray-500 hover:text-white text-base leading-none transition-colors"
              title="Novo projeto"
            >
              +
            </button>
          </div>

          {creating && (
            <form onSubmit={handleCreate} className="px-3 pb-2 flex gap-1.5">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do projeto"
                className="flex-1 bg-white/10 text-white text-xs px-2 py-1.5 rounded-lg outline-none placeholder:text-gray-500 min-w-0"
              />
              <button
                type="submit"
                disabled={saving || !newName.trim()}
                className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-2 py-1 rounded-lg font-medium transition-colors"
              >
                {saving ? '...' : 'Ok'}
              </button>
            </form>
          )}

          {workspaces.length === 0 && !creating ? (
            <p className="text-xs text-gray-600 px-3 py-1">Nenhum projeto ainda</p>
          ) : (
            workspaces.map((ws) => {
              const href = `/dashboard/workspaces/${ws.id}`
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={ws.id}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors truncate',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="truncate">{ws.name}</span>
                </Link>
              )
            })
          )}
        </div>

        <div className="h-px bg-white/5 my-1" />

        {/* Navigation */}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-300 truncate">{userName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle className="text-sm text-gray-500 hover:text-gray-300 transition-colors" />
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              title="Sair"
            >
              ⎋
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
