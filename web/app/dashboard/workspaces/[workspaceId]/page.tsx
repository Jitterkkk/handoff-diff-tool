import { cookies } from 'next/headers'
import { getReviews, getWorkspaces, getWorkspaceMembers, getMe } from '@/lib/api'
import { WorkspaceDetailClient } from '@/components/WorkspaceDetailClient'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { ReviewSummary, WorkspaceWithRole, WorkspaceMember } from '@/lib/types'

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
  let members: WorkspaceMember[] = []
  let currentUserId = ''

  if (token) {
    const [workspacesResult, meResult] = await Promise.allSettled([
      getWorkspaces({ token }),
      getMe({ token }),
    ])

    if (workspacesResult.status === 'fulfilled') {
      workspace = workspacesResult.value.find(w => w.id === workspaceId) ?? null
    }
    if (meResult.status === 'fulfilled') {
      currentUserId = meResult.value.id
    }

    if (workspace) {
      const [reviewsResult, membersResult] = await Promise.allSettled([
        getReviews({ token, workspaceId }),
        getWorkspaceMembers({ token }, workspaceId),
      ])
      if (reviewsResult.status === 'fulfilled') reviews = reviewsResult.value.reviews
      if (membersResult.status === 'fulfilled') members = membersResult.value
    }
  }

  if (!workspace) notFound()

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <WorkspaceDetailClient
        workspace={workspace}
        initialReviews={reviews}
        initialMembers={members}
        currentUserId={currentUserId}
      />
    </div>
  )
}
