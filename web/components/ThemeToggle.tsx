'use client'

import { useDarkMode } from './ThemeProvider'

interface Props {
  className?: string
}

export function ThemeToggle({ className }: Props) {
  const { isDark, toggle } = useDarkMode()

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      className={className}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
