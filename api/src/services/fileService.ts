import { sql } from '../db/index.js'
import type { DbFile, FileWithStats } from '../types/index.js'

export async function upsertFile(figmaFileKey: string, name: string): Promise<DbFile> {
  const rows = await sql<DbFile[]>`
    INSERT INTO files (figma_file_key, name)
    VALUES (${figmaFileKey}, ${name})
    ON CONFLICT (figma_file_key) DO UPDATE
      SET name = EXCLUDED.name,
          updated_at = NOW()
    RETURNING *
  `
  return rows[0]
}

export async function getFileMembers(figmaFileKey: string) {
  const rows = await sql`
    SELECT u.id, u.figma_user_id, u.name, u.email, u.avatar_url, fm.role, fm.joined_at
    FROM file_members fm
    JOIN users u ON u.id = fm.user_id
    JOIN files f ON f.id = fm.file_id
    WHERE f.figma_file_key = ${figmaFileKey}
    ORDER BY fm.joined_at ASC
  `
  return rows
}

type FileRow = {
  figma_file_key: string
  name: string
  total: number
  pending: number
  in_progress: number
  done: number
  last_review_at: Date
}

export async function listFiles(figmaUserId: string): Promise<FileWithStats[]> {
  const rows = await sql<FileRow[]>`
    SELECT
      f.figma_file_key,
      f.name,
      COUNT(*)::int                                           AS total,
      COUNT(*) FILTER (WHERE r.status = 'pending')::int      AS pending,
      COUNT(*) FILTER (WHERE r.status = 'in_progress')::int  AS in_progress,
      COUNT(*) FILTER (WHERE r.status = 'done')::int         AS done,
      MAX(r.published_at)                                     AS last_review_at
    FROM files f
    JOIN reviews r ON r.file_id = f.id
    JOIN users u ON u.id = r.published_by
    WHERE u.figma_user_id = ${figmaUserId}
      AND r.archived_at IS NULL
    GROUP BY f.id, f.figma_file_key, f.name
    ORDER BY MAX(r.published_at) DESC
  `
  return rows.map(row => ({
    fileKey: row.figma_file_key,
    fileName: row.name,
    totalReviews: row.total,
    pending: row.pending,
    inProgress: row.in_progress,
    done: row.done,
    lastReviewAt: row.last_review_at,
  }))
}

export async function checkFileAccess(figmaUserId: string, fileKey: string): Promise<boolean> {
  const [row] = await sql`
    SELECT 1 FROM files f
    JOIN reviews r ON r.file_id = f.id
    JOIN users u ON u.id = r.published_by
    WHERE f.figma_file_key = ${fileKey}
      AND u.figma_user_id = ${figmaUserId}
    LIMIT 1
  `
  return !!row
}
