import { cn } from '@/lib/utils'
import type { ReviewStatus } from '@/lib/types'

const config: Record<ReviewStatus, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-red-100 text-red-700' },
  in_progress: { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-700' },
  done: { label: 'Concluído', className: 'bg-green-100 text-green-700' },
}

export function StatusBadge({ status }: { status: ReviewStatus }) {
  const { label, className } = config[status]
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', className)}>
      {label}
    </span>
  )
}
