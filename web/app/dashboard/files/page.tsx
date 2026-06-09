import { cookies } from 'next/headers'
import { getFiles } from '@/lib/api'
import { FileCard } from '@/components/FileCard'
import { Onboarding } from '@/components/Onboarding'
import type { FileWithStats } from '@/lib/types'

export default async function FilesPage() {
  const store = await cookies()
  const token = store.get('handoff_token')?.value

  let files: FileWithStats[] = []
  if (token) {
    try {
      files = await getFiles({ token })
    } catch {}
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Arquivos</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          {files.length} arquivo{files.length !== 1 ? 's' : ''} com reviews
        </p>
      </div>

      {files.length === 0 ? (
        <Onboarding />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {files.map(f => <FileCard key={f.fileKey} file={f} />)}
        </div>
      )}
    </div>
  )
}
