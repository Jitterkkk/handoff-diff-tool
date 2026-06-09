import Link from 'next/link'
import type { FileWithStats } from '@/lib/types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} dia${days !== 1 ? 's' : ''}`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}min`
  return 'agora'
}

interface Props {
  file: FileWithStats
}

export function FileCard({ file }: Props) {
  return (
    <Link
      href={`/dashboard/files/${encodeURIComponent(file.fileKey)}`}
      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
          {file.fileName}
        </h3>
        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {file.totalReviews} review{file.totalReviews !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {file.pending > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
            {file.pending} pendente{file.pending !== 1 ? 's' : ''}
          </span>
        )}
        {file.inProgress > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 dark:bg-yellow-400" />
            {file.inProgress} em andamento
          </span>
        )}
        {file.done > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
            {file.done} concluído{file.done !== 1 ? 's' : ''}
          </span>
        )}
        {file.pending === 0 && file.inProgress === 0 && file.done === 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">Sem reviews ativos</span>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Último review há {timeAgo(file.lastReviewAt)}
      </p>
    </Link>
  )
}
