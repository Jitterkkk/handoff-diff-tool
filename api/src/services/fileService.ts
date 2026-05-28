import { sql } from '../db/index.js'
import type { DbFile } from '../types/index.js'

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
