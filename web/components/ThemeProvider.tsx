'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContext {
  isDark: boolean
  toggle: () => void
}

const ThemeCtx = createContext<ThemeContext>({ isDark: false, toggle: () => {} })

export function useDarkMode(): ThemeContext {
  return useContext(ThemeCtx)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = stored === 'dark' || (stored === null && prefersDark)
    setIsDark(dark)
    setMounted(true)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <ThemeCtx.Provider value={{ isDark: mounted ? isDark : false, toggle }}>
      {children}
    </ThemeCtx.Provider>
  )
}
