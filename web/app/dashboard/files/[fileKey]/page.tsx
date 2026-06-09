import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getFiles, getFileReviews } from '@/lib/api'
import { ReviewsListClient } from '@/components/ReviewsListClient'
import type { ReviewSummary, ReviewsPage } from '@/lib/types'

interface Props {
  params: Promise<{ fileKey: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function FileReviewsPage({ params, searchParams }: Props) {
  const { fileKey } = await params
  const { status } = await searchParams
  const store = await cookies()
  const token = store.get('handoff_token')?.value

  if (!token) notFound()

  const [filesResult, pageResult] = await Promise.allSettled([
    getFiles({ token }),
    getFileReviews({ token, fileKey, status }),
  ])

  if (pageResult.status === 'rejected') {
    const err = pageResult.reason as Error
    if (err.message === 'File not found') notFound()
  }

  const page: ReviewsPage = pageResult.status === 'fulfilled'
    ? pageResult.value
    : { reviews: [], total: 0, limit: 20, offset: 0, hasMore: false }

  const files = filesResult.status === 'fulfilled' ? filesResult.value : []
  const fileName = files.find(f => f.fileKey === fileKey)?.fileName ?? fileKey

  const reviews: ReviewSummary[] = page.reviews

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 mb-3">
          <Link href="/dashboard/files" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            Arquivos
          </Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-xs">{fileName}</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{fileName}</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          {page.total} review{page.total !== 1 ? 's' : ''} no total
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">◻</p>
          <p className="text-sm font-medium">Nenhum review encontrado</p>
          <p className="text-xs mt-1">Tente outro filtro ou publique um review pelo plugin</p>
        </div>
      ) : (
        <ReviewsListClient initialReviews={reviews} initialStatus={status} />
      )}
    </div>
  )
}
