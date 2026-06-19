import { cookies } from 'next/headers'
import { getReviews, getWorkspaces } from '@/lib/api'
import { WorkspaceDetailClient } from '@/components/WorkspaceDetailClient'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { ReviewSummary, WorkspaceWithRole } from '@/lib/types'

interface Props {
  params: Promise<{ workspaceId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceId } = await params
  const store = await cookies()
  const token = store.get('handoff_token')?.value ?? ''
  try {
    const workspaces = await getWorkspaces({ token })
    const ws = workspaces.find(w => w.id === workspaceId)
    if (ws) return { title: `${ws.name} — Handoff` }
  } catch {}
  return { title: 'Projeto — Handoff' }
}

export default async function WorkspacePage({ params }: Props) {
  const { workspaceId } = await params
  const store = await cookies()
  const token = store.get('handoff_token')?.value ?? ''

  let workspace: WorkspaceWithRole | null = null
  let reviews: ReviewSummary[] = []

  if (token) {
    try {
      const workspaces = await getWorkspaces({ token })
      workspace = workspaces.find(w => w.id === workspaceId) ?? null
    } catch {}

    if (workspace) {
      try {
        reviews = (await getReviews({ token, workspaceId })).reviews
      } catch {}
    }
  }

  if (!workspace) notFound()

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <WorkspaceDetailClient workspace={workspace} initialReviews={reviews} />
    </div>
  )
}
