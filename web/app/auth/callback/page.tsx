'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function CallbackHandler() {
  const params = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      router.replace('/login')
      return
    }
    document.cookie = `handoff_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`
    router.replace('/dashboard')
  }, [params, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Autenticando...</p>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Autenticando...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  )
}
