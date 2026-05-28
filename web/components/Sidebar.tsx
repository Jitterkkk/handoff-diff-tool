'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: '◻' },
  { href: '/dashboard/reviews', label: 'Reviews', icon: '◈' },
]

interface Props {
  userName: string
}

export function Sidebar({ userName }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    document.cookie = 'handoff_token=; max-age=0; path=/'
    router.push('/login')
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-gray-950 text-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="0.5" y="0.5" width="9" height="9" rx="2" fill="#18a0fb" />
            <rect x="12.5" y="0.5" width="9" height="9" rx="2" fill="#18a0fb" opacity="0.4" />
            <rect x="0.5" y="12.5" width="9" height="9" rx="2" fill="#18a0fb" opacity="0.4" />
            <rect x="12.5" y="12.5" width="9" height="9" rx="2" fill="#18a0fb" />
          </svg>
        </div>
        <span className="font-bold text-base tracking-tight">Handoff</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
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
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-300 truncate">{userName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
            title="Sair"
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>
  )
}
