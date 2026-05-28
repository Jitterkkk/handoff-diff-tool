import { cookies } from 'next/headers'
import Link from 'next/link'
import { getReviews } from '@/lib/api'
import { ReviewCard } from '@/components/ReviewCard'
import type { ReviewSummary } from '@/lib/types'

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

export default async function DashboardPage() {
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

  const pending = reviews.filter(r => r.status === 'pending').length
  const inProgress = reviews.filter(r => r.status === 'in_progress').length
  const done = reviews.filter(r => r.status === 'done').length
  const recent = reviews.slice(0, 5)

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-sm text-gray-400 mt-1">Resumo dos reviews do seu time</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <SummaryCard label="Total" value={reviews.length} color="text-gray-900" />
        <SummaryCard label="Pendentes" value={pending} color="text-red-600" />
        <SummaryCard label="Em andamento" value={inProgress} color="text-yellow-600" />
        <SummaryCard label="Concluídos" value={done} color="text-green-600" />
      </div>

      {/* Recent reviews */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Reviews recentes</h2>
        <Link href="/dashboard/reviews" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          Ver todos →
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">◻</p>
          <p className="text-sm font-medium">Nenhum review publicado ainda</p>
          <p className="text-xs mt-1">Publique um review pelo plugin do Figma para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recent.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </div>
  )
}
