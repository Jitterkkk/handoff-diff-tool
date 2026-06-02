import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Handoff — Dashboard',
  description: 'Acompanhe as mudanças de design do seu time',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        {/* Previne flash de tema incorreto antes da hidratação */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch {}
        `}} />
      </head>
      <body className={`${inter.className} h-full antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
