import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db/index.js'
import {
  createWorkspace,
  listUserWorkspaces,
  getWorkspace,
  generateInvite,
  joinByInvite,
} from '../services/workspaceService.js'

const CreateWorkspaceSchema = z.object({ name: z.string().min(1).max(100) })
const WorkspaceParamsSchema = z.object({ workspaceId: z.string().uuid() })
const JoinParamsSchema = z.object({ token: z.string().min(1) })

async function getUserId(figmaUserId: string): Promise<string | null> {
  const [u] = await sql<{ id: string }[]>`SELECT id FROM users WHERE figma_user_id = ${figmaUserId}`
  return u?.id ?? null
}

export async function workspaceRoutes(app: FastifyInstance) {
  // GET /api/workspaces — lista workspaces do usuário
  app.get('/api/workspaces', { onRequest: [app.authenticate] }, async (req, reply) => {
    const userId = await getUserId(req.user.figmaUserId)
    if (!userId) return reply.code(401).send({ error: 'User not found' })
    return reply.send(await listUserWorkspaces(userId))
  })

  // POST /api/workspaces — cria workspace
  app.post('/api/workspaces', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { name } = CreateWorkspaceSchema.parse(req.body)
    const userId = await getUserId(req.user.figmaUserId)
    if (!userId) return reply.code(401).send({ error: 'User not found' })
    return reply.code(201).send(await createWorkspace(name, userId))
  })

  // POST /api/workspaces/join/:token — entra pelo convite (público ou autenticado)
  // Registrado ANTES de /:workspaceId para evitar colisão de rota
  app.post<{ Params: z.infer<typeof JoinParamsSchema> }>(
    '/api/workspaces/join/:token',
    async (req, reply) => {
      const { token } = JoinParamsSchema.parse(req.params)

      const [invite] = await sql<{ workspace_id: string }[]>`
        SELECT workspace_id FROM workspace_invites
        WHERE token = ${token} AND expires_at > NOW()
      `
      if (!invite) return reply.code(404).send({ error: 'Invalid or expired invite' })

      try {
        await req.jwtVerify()
      } catch {
        const [ws] = await sql<{ name: string }[]>`
          SELECT name FROM workspaces WHERE id = ${invite.workspace_id}
        `
        return reply.send({ requiresAuth: true, workspaceName: ws?.name ?? '', token })
      }

      const userId = await getUserId(req.user.figmaUserId)
      if (!userId) return reply.code(401).send({ error: 'User not found' })

      return reply.send(await joinByInvite(token, userId))
    },
  )

  // GET /api/workspaces/:workspaceId — detalhe do workspace
  app.get<{ Params: z.infer<typeof WorkspaceParamsSchema> }>(
    '/api/workspaces/:workspaceId',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const { workspaceId } = WorkspaceParamsSchema.parse(req.params)
      const userId = await getUserId(req.user.figmaUserId)
      if (!userId) return reply.code(401).send({ error: 'User not found' })
      const workspace = await getWorkspace(workspaceId, userId)
      if (!workspace) return reply.code(404).send({ error: 'Workspace not found' })
      return reply.send(workspace)
    },
  )

  // POST /api/workspaces/:workspaceId/invite — gera link de convite
  app.post<{ Params: z.infer<typeof WorkspaceParamsSchema> }>(
    '/api/workspaces/:workspaceId/invite',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const { workspaceId } = WorkspaceParamsSchema.parse(req.params)
      const userId = await getUserId(req.user.figmaUserId)
      if (!userId) return reply.code(401).send({ error: 'User not found' })
      const workspace = await getWorkspace(workspaceId, userId)
      if (!workspace) return reply.code(404).send({ error: 'Workspace not found' })
      const token = await generateInvite(workspaceId, userId)
      return reply.send({ token, url: `https://handoff-diff-tool.vercel.app/invite/${token}` })
    },
  )
}
