export interface DbFile {
  id: string
  figma_file_key: string
  name: string
  created_at: Date
  updated_at: Date
}

export interface DbUser {
  id: string
  figma_user_id: string
  name: string
  email: string | null
  avatar_url: string | null
  created_at: Date
  updated_at: Date
}

export interface DbReview {
  id: string
  file_id: string
  frame_id: string
  frame_name: string
  published_by: string
  description: string
  status: 'pending' | 'in_progress' | 'done'
  snapshot_before: unknown
  snapshot_after: unknown
  published_at: Date
  updated_at: Date
  archived_at: Date | null
}

export interface DbReviewItem {
  id: string
  review_id: string
  node_id: string
  node_name: string
  diff_type: string
  severity: 'high' | 'medium' | 'low'
  before_value: unknown
  after_value: unknown
  checked_at: Date | null
  checked_by: string | null
  comment: string | null
  created_at: Date
}

export interface ReviewSummary {
  id: string
  frame_id: string
  frame_name: string
  status: 'pending' | 'in_progress' | 'done'
  description: string
  published_at: Date
  updated_at: Date
  published_by_name: string
  total_items: number
  checked_items: number
}

export interface ReviewDetail extends ReviewSummary {
  file_key: string
  file_name: string
  items: DbReviewItem[]
}

export type ReviewStatus = 'pending' | 'in_progress' | 'done'

export interface ReviewsPage {
  reviews: ReviewSummary[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface FileWithStats {
  fileKey: string
  fileName: string
  totalReviews: number
  pending: number
  inProgress: number
  done: number
  lastReviewAt: Date
}

export interface PublicReviewItem {
  id: string
  node_id: string
  node_name: string
  diff_type: string
  severity: 'high' | 'medium' | 'low'
  before_value: unknown
  after_value: unknown
  checked_at: Date | null
  comment?: string
}

export interface PublicReview {
  id: string
  file_key: string
  frame_name: string
  description: string
  status: ReviewStatus
  published_at: Date
  published_by_name: string
  items: PublicReviewItem[]
}
