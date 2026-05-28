import { cookies } from 'next/headers'
import { getReviews } from '@/lib/api'
import { ReviewCard } from '@/components/ReviewCard'
import type { ReviewSummary, ReviewStatus } from '@/lib/types'

const FILTERS: { label: string; value: ReviewStatus | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Em andamento', value: 'in_progress' },
  { label: 'Concluídos', value: 'done' },
]

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function ReviewsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const store = await cookies()
  const token = store.get('handoff_token')?.value

  let reviews: ReviewSummary[] = []
  if (token) {
    try {
      reviews = await getReviews({ token })
    } catch {
      reviews = []
    }
  }

  const filtered = status && status !== 'all'
    ? reviews.filter(r => r.status === status)
    : reviews

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''} no total</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <a
            key={f.value}
            href={f.value === 'all' ? '/dashboard/reviews' : `?status=${f.value}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              (status ?? 'all') === f.value
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">◻</p>
          <p className="text-sm font-medium">Nenhum review encontrado</p>
          <p className="text-xs mt-1">Tente outro filtro ou publique um review pelo plugin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </div>
  )
}
