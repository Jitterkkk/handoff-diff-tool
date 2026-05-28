import { cn } from '@/lib/utils'

interface Props {
  checked: number
  total: number
  size?: 'sm' | 'md'
}

export function ProgressBar({ checked, total, size = 'sm' }: Props) {
  const pct = total === 0 ? 0 : Math.round((checked / total) * 100)

  return (
    <div className="w-full">
      <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div
          className="bg-green-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{checked} de {total} revisados</p>
    </div>
  )
}
