import { randomBytes } from 'crypto'
import { sql } from '../db/index.js'
import type { Workspace, WorkspaceWithRole } from '../types/index.js'

type DbWorkspace = {
  id: string
  name: string
  slug: string
  created_by: string
  created_at: Date
  updated_at: Date
}

type DbInvite = {
  id: string
  workspace_id: string
  token: string
  created_by: string
  expires_at: Date
  created_at: Date
}

function toWorkspace(row: DbWorkspace): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  }
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace'
  for (let i = 0; i < 10; i++) {
    const slug = i === 0 ? base : `${base}-${i}`
    const [existing] = await sql`SELECT id FROM workspaces WHERE slug = ${slug} LIMIT 1`
    if (!existing) return slug
  }
  return `${base}-${Date.now()}`
}

export async function createWorkspace(name: string, createdByUserId: string): Promise<Workspace> {
  const slug = await generateUniqueSlug(name)

  const [ws] = await sql<DbWorkspace[]>`
    INSERT INTO workspaces (name, slug, created_by)
    VALUES (${name}, ${slug}, ${createdByUserId})
    RETURNING *
  `

  await sql`
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (${ws.id}, ${createdByUserId}, 'owner')
  `

  return toWorkspace(ws)
}

export async function listUserWorkspaces(userId: string): Promise<WorkspaceWithRole[]> {
  type Row = DbWorkspace & { role: 'owner' | 'member'; member_count: number }
  const rows = await sql<Row[]>`
    SELECT
      w.id, w.name, w.slug, w.created_by, w.created_at, w.updated_at,
      wm.role,
      COUNT(wm2.user_id)::int AS member_count
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ${userId}
    JOIN workspace_members wm2 ON wm2.workspace_id = w.id
    GROUP BY w.id, w.name, w.slug, w.created_by, w.created_at, w.updated_at, wm.role
    ORDER BY w.created_at DESC
  `
  return rows.map(r => ({ ...toWorkspace(r), role: r.role, memberCount: r.member_count }))
}

export async function getWorkspace(workspaceId: string, userId: string): Promise<Workspace | null> {
  const [ws] = await sql<DbWorkspace[]>`
    SELECT w.*
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE w.id = ${workspaceId} AND wm.user_id = ${userId}
  `
  return ws ? toWorkspace(ws) : null
}

export async function generateInvite(workspaceId: string, createdByUserId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await sql`
    INSERT INTO workspace_invites (workspace_id, token, created_by)
    VALUES (${workspaceId}, ${token}, ${createdByUserId})
  `
  return token
}

export async function joinByInvite(token: string, userId: string): Promise<Workspace | null> {
  const [invite] = await sql<DbInvite[]>`
    SELECT * FROM workspace_invites
    WHERE token = ${token} AND expires_at > NOW()
  `
  if (!invite) return null

  await sql`
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (${invite.workspace_id}, ${userId}, 'member')
    ON CONFLICT (workspace_id, user_id) DO NOTHING
  `

  const [ws] = await sql<DbWorkspace[]>`
    SELECT * FROM workspaces WHERE id = ${invite.workspace_id}
  `
  return ws ? toWorkspace(ws) : null
}
