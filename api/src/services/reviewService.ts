import { sql } from '../db/index.js'
import { publishEvent } from '../redis/index.js'
import type { DbUser, DbReview, DbReviewItem, ReviewSummary, ReviewDetail, ReviewStatus, ReviewsPage, PublicReview, PublicReviewItem } from '../types/index.js'
import type { PublishReviewBody, DiffResult } from '../schemas/review.js'

async function upsertUser(figmaUserId: string, name: string, email?: string, avatarUrl?: string): Promise<DbUser> {
  const rows = await sql<DbUser[]>`
    INSERT INTO users (figma_user_id, name, email, avatar_url)
    VALUES (${figmaUserId}, ${name}, ${email ?? null}, ${avatarUrl ?? null})
    ON CONFLICT (figma_user_id) DO UPDATE
      SET name = EXCLUDED.name,
          email = COALESCE(EXCLUDED.email, users.email),
          avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
          updated_at = NOW()
    RETURNING *
  `
  return rows[0]
}

function computeStatus(items: DbReviewItem[]): ReviewStatus {
  const total = items.length
  const checked = items.filter(i => i.checked_at !== null).length
  if (checked === 0) return 'pending'
  if (checked === total) return 'done'
  return 'in_progress'
}

export async function publishReview(body: PublishReviewBody): Promise<ReviewDetail> {
  const { fileKey, fileName, frameId, frameName, description, publishedBy, items, workspaceId } = body

  if (workspaceId) {
    const [member] = await sql<{ workspace_id: string }[]>`
      SELECT wm.workspace_id
      FROM workspace_members wm
      JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = ${workspaceId}
        AND u.figma_user_id = ${publishedBy.figmaUserId}
    `
    if (!member) {
      throw Object.assign(new Error('Not a member of this workspace'), { statusCode: 403 })
    }
  }

  const [fileRow] = await sql`
    INSERT INTO files (figma_file_key, name)
    VALUES (${fileKey}, ${fileName})
    ON CONFLICT (figma_file_key) DO UPDATE
      SET name = EXCLUDED.name,
          updated_at = NOW()
    RETURNING *
  `

  const user = await upsertUser(
    publishedBy.figmaUserId,
    publishedBy.name,
    publishedBy.email,
    publishedBy.avatarUrl,
  )

  const review = await sql.begin(async (tx) => {
    const [rev] = await tx<DbReview[]>`
      INSERT INTO reviews (file_id, frame_id, frame_name, published_by, description, workspace_id)
      VALUES (${fileRow.id}, ${frameId}, ${frameName}, ${user.id}, ${description}, ${workspaceId ?? null})
      RETURNING *
    `

    if (items.length > 0) {
      await tx`
        INSERT INTO review_items ${tx(
          items.map((item: DiffResult) => ({
            review_id: rev.id,
            node_id: item.nodeId,
            node_name: item.nodeName,
            diff_type: item.type,
            severity: item.severity,
            before_value: item.before !== undefined ? JSON.stringify(item.before) : null,
            after_value: item.after !== undefined ? JSON.stringify(item.after) : null,
          }))
        )}
      `
    }

    return rev
  })

  const reviewItems = await sql<DbReviewItem[]>`
    SELECT * FROM review_items WHERE review_id = ${review.id} ORDER BY created_at ASC
  `

  await publishEvent(`reviews:${fileKey}`, {
    type: 'REVIEW_PUBLISHED',
    reviewId: review.id,
    frameId,
    frameName,
    status: review.status,
  }).catch(() => {})

  return {
    id: review.id,
    file_key: fileKey,
    file_name: fileName,
    frame_id: review.frame_id,
    frame_name: review.frame_name,
    status: review.status,
    description: review.description,
    published_at: review.published_at,
    updated_at: review.updated_at,
    published_by_name: user.name,
    total_items: reviewItems.length,
    checked_items: reviewItems.filter(i => i.checked_at !== null).length,
    items: reviewItems,
  }
}

export async function listReviews(
  figmaUserId: string,
  fileKey?: string,
  status?: string,
  limit = 20,
  offset = 0,
  workspaceId?: string,
): Promise<ReviewsPage> {
  if (workspaceId) {
    const [member] = await sql<{ workspace_id: string }[]>`
      SELECT wm.workspace_id
      FROM workspace_members wm
      JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = ${workspaceId}
        AND u.figma_user_id = ${figmaUserId}
    `
    if (!member) {
      throw Object.assign(new Error('Not a member of this workspace'), { statusCode: 403 })
    }
  }

  const archiveFilter = status === 'archived'
    ? sql`AND r.archived_at IS NOT NULL`
    : sql`AND r.archived_at IS NULL`
  const statusFilter = status && status !== 'archived'
    ? sql`AND r.status = ${status}`
    : sql``

  const workspaceFilter = workspaceId
    ? sql`AND r.workspace_id = ${workspaceId}`
    : sql``

  const [countRow] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM reviews r
    JOIN files f ON f.id = r.file_id
    JOIN users u ON u.id = r.published_by
    WHERE u.figma_user_id = ${figmaUserId}
      ${fileKey ? sql`AND f.figma_file_key = ${fileKey}` : sql``}
      ${archiveFilter}
      ${statusFilter}
      ${workspaceFilter}
  `
  const total = countRow?.count ?? 0

  const rows = await sql<ReviewSummary[]>`
    SELECT
      r.id,
      r.frame_id,
      r.frame_name,
      r.status,
      r.description,
      r.published_at,
      r.updated_at,
      u.name AS published_by_name,
      COUNT(ri.id)::int AS total_items,
      COUNT(ri.checked_at)::int AS checked_items
    FROM reviews r
    JOIN files f ON f.id = r.file_id
    JOIN users u ON u.id = r.published_by
    LEFT JOIN review_items ri ON ri.review_id = r.id
    WHERE u.figma_user_id = ${figmaUserId}
      ${fileKey ? sql`AND f.figma_file_key = ${fileKey}` : sql``}
      ${archiveFilter}
      ${statusFilter}
      ${workspaceFilter}
    GROUP BY r.id, u.name
    ORDER BY r.published_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  return { reviews: rows, total, limit, offset, hasMore: offset + rows.length < total }
}

export async function deleteReview(reviewId: string, figmaUserId: string): Promise<'deleted' | 'not_found' | 'forbidden'> {
  const [review] = await sql<{ id: string; figma_user_id: string }[]>`
    SELECT r.id, u.figma_user_id
    FROM reviews r
    JOIN users u ON u.id = r.published_by
    WHERE r.id = ${reviewId}
  `
  if (!review) return 'not_found'
  if (review.figma_user_id !== figmaUserId) return 'forbidden'

  await sql`DELETE FROM reviews WHERE id = ${reviewId}`
  return 'deleted'
}

export async function archiveReview(reviewId: string, figmaUserId: string): Promise<ReviewDetail | 'not_found' | 'forbidden'> {
  const [review] = await sql<{ id: string; figma_user_id: string }[]>`
    SELECT r.id, u.figma_user_id
    FROM reviews r
    JOIN users u ON u.id = r.published_by
    WHERE r.id = ${reviewId}
  `
  if (!review) return 'not_found'
  if (review.figma_user_id !== figmaUserId) return 'forbidden'

  await sql`UPDATE reviews SET archived_at = NOW(), updated_at = NOW() WHERE id = ${reviewId}`
  return getReview(reviewId) as Promise<ReviewDetail>
}

export async function getReview(reviewId: string): Promise<ReviewDetail | null> {
  type ReviewWithUser = DbReview & { published_by_name: string; figma_file_key: string; file_name: string }
  const [review] = await sql<ReviewWithUser[]>`
    SELECT r.*, u.name AS published_by_name, f.figma_file_key, f.name AS file_name
    FROM reviews r
    JOIN users u ON u.id = r.published_by
    JOIN files f ON f.id = r.file_id
    WHERE r.id = ${reviewId}
  `
  if (!review) return null

  const items = await sql<DbReviewItem[]>`
    SELECT * FROM review_items WHERE review_id = ${reviewId} ORDER BY created_at ASC
  `

  return {
    id: review.id,
    file_key: review.figma_file_key,
    file_name: review.file_name,
    frame_id: review.frame_id,
    frame_name: review.frame_name,
    status: review.status as ReviewStatus,
    description: review.description,
    published_at: review.published_at,
    updated_at: review.updated_at,
    published_by_name: review.published_by_name,
    total_items: items.length,
    checked_items: items.filter(i => i.checked_at !== null).length,
    items,
  }
}

export async function getPublicReview(reviewId: string): Promise<PublicReview | null> {
  type ReviewWithUser = DbReview & { published_by_name: string; figma_file_key: string }
  const [review] = await sql<ReviewWithUser[]>`
    SELECT r.*, u.name AS published_by_name, f.figma_file_key
    FROM reviews r
    JOIN users u ON u.id = r.published_by
    JOIN files f ON f.id = r.file_id
    WHERE r.id = ${reviewId}
  `
  if (!review) return null

  const items = await sql<DbReviewItem[]>`
    SELECT id, node_id, node_name, diff_type, severity, before_value, after_value, checked_at, comment
    FROM review_items
    WHERE review_id = ${reviewId}
    ORDER BY created_at ASC
  `

  return {
    id: review.id,
    file_key: review.figma_file_key,
    frame_name: review.frame_name,
    description: review.description,
    status: review.status,
    published_at: review.published_at,
    published_by_name: review.published_by_name,
    items: items.map(i => ({
      id: i.id,
      node_id: i.node_id,
      node_name: i.node_name,
      diff_type: i.diff_type,
      severity: i.severity,
      before_value: i.before_value,
      after_value: i.after_value,
      checked_at: i.checked_at,
      comment: i.comment ?? undefined,
    })),
  }
}

export async function patchPublicReviewItem(
  reviewId: string,
  itemId: string,
  checked: boolean,
  comment?: string,
): Promise<PublicReviewItem | null> {
  const updated = await sql<DbReviewItem[]>`
    UPDATE review_items
    SET
      checked_at = ${checked ? sql`NOW()` : sql`NULL`},
      comment = COALESCE(${comment ?? null}, comment)
    WHERE id = ${itemId} AND review_id = ${reviewId}
    RETURNING *
  `
  if (updated.length === 0) return null

  const allItems = await sql<DbReviewItem[]>`SELECT * FROM review_items WHERE review_id = ${reviewId}`
  const newStatus = computeStatus(allItems)
  await sql`UPDATE reviews SET status = ${newStatus}, updated_at = NOW() WHERE id = ${reviewId}`

  const [fileRow] = await sql<{ figma_file_key: string }[]>`
    SELECT f.figma_file_key FROM reviews r JOIN files f ON f.id = r.file_id WHERE r.id = ${reviewId}
  `
  if (fileRow) {
    await publishEvent(`reviews:${fileRow.figma_file_key}`, {
      type: 'REVIEW_ITEM_UPDATED',
      reviewId,
      itemId,
      checked,
      newStatus,
    }).catch(() => {})
  }

  const item = updated[0]
  return {
    id: item.id,
    node_id: item.node_id,
    node_name: item.node_name,
    diff_type: item.diff_type,
    severity: item.severity,
    before_value: item.before_value,
    after_value: item.after_value,
    checked_at: item.checked_at,
    comment: item.comment ?? undefined,
  }
}

export async function patchReviewItem(
  reviewId: string,
  itemId: string,
  checked: boolean,
  checkedBy?: { figmaUserId: string; name: string },
  comment?: string,
): Promise<ReviewDetail | null> {
  let checkerId: string | null = null
  if (checkedBy) {
    const user = await upsertUser(checkedBy.figmaUserId, checkedBy.name)
    checkerId = user.id
  }

  await sql`
    UPDATE review_items
    SET
      checked_at = ${checked ? sql`NOW()` : sql`NULL`},
      checked_by = ${checked && checkerId ? checkerId : sql`NULL`},
      comment = COALESCE(${comment ?? null}, comment)
    WHERE id = ${itemId} AND review_id = ${reviewId}
  `

  const allItems = await sql<DbReviewItem[]>`
    SELECT * FROM review_items WHERE review_id = ${reviewId}
  `

  const newStatus = computeStatus(allItems)

  const [fileKey] = await sql<{ figma_file_key: string }[]>`
    SELECT f.figma_file_key
    FROM reviews r
    JOIN files f ON f.id = r.file_id
    WHERE r.id = ${reviewId}
  `

  await sql`
    UPDATE reviews SET status = ${newStatus}, updated_at = NOW() WHERE id = ${reviewId}
  `

  if (fileKey) {
    await publishEvent(`reviews:${fileKey.figma_file_key}`, {
      type: 'REVIEW_ITEM_UPDATED',
      reviewId,
      itemId,
      checked,
      newStatus,
    }).catch(() => {})
  }

  return getReview(reviewId)
}
