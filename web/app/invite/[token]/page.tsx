import { InviteClient } from '@/components/InviteClient'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://handoff-api.onrender.com'

interface Props {
  params: Promise<{ token: string }>
}

async function getWorkspaceName(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/join/${token}`, {
      method: 'POST',
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json() as { requiresAuth?: boolean; workspaceName?: string }
    return data.workspaceName ?? null
  } catch {
    return null
  }
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const workspaceName = await getWorkspaceName(token)

  if (!workspaceName) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <div className="text-center">
          <p className="text-white text-lg font-semibold">Convite inválido ou expirado</p>
          <a href="/login" className="text-blue-400 text-sm mt-2 inline-block hover:underline">
            Ir para o login →
          </a>
        </div>
      </main>
    )
  }

  return <InviteClient token={token} workspaceName={workspaceName} />
}
