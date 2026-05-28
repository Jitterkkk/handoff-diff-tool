export type ReviewStatus = 'pending' | 'in_progress' | 'done'
export type DiffType = 'COLOR' | 'SIZE' | 'TYPOGRAPHY' | 'CONTENT' | 'ADDED' | 'REMOVED' | 'COMPONENT' | 'LAYOUT' | 'POSITION'
export type Severity = 'high' | 'medium' | 'low'

export interface ReviewSummary {
  id: string
  frame_id: string
  frame_name: string
  status: ReviewStatus
  description: string
  published_at: string
  updated_at: string
  published_by_name: string
  total_items: number
  checked_items: number
}

export interface ReviewItem {
  id: string
  node_id: string
  node_name: string
  diff_type: DiffType
  severity: Severity
  before_value: unknown
  after_value: unknown
  checked_at: string | null
  checked_by: string | null
}

export interface ReviewDetail extends ReviewSummary {
  items: ReviewItem[]
}
