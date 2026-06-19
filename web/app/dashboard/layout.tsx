import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decodeToken } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import { getWorkspaces } from '@/lib/api'
import type { WorkspaceWithRole } from '@/lib/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies()
  const token = store.get('handoff_token')?.value
  if (!token) redirect('/login')

  const payload = decodeToken(token)
  const userName = payload?.name ?? 'Usuário'

  let workspaces: WorkspaceWithRole[] = []
  try {
    workspaces = await getWorkspaces({ token })
  } catch {
    // workspaces are non-critical — render layout without them
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar userName={userName} workspaces={workspaces} />
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {children}
      </div>
    </div>
  )
}
