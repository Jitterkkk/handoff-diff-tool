import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db/index.js'
import type { DbUser } from '../types/index.js'

const PluginAuthBodySchema = z.object({
  figmaUserId: z.string().min(1),
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/plugin', async (req, reply) => {
    const body = PluginAuthBodySchema.parse(req.body)

    const [user] = await sql<DbUser[]>`
      INSERT INTO users (figma_user_id, name, avatar_url)
      VALUES (${body.figmaUserId}, ${body.name}, ${body.avatarUrl ?? null})
      ON CONFLICT (figma_user_id) DO UPDATE
        SET name        = EXCLUDED.name,
            avatar_url  = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
            updated_at  = NOW()
      RETURNING *
    `

    const token = app.jwt.sign(
      { figmaUserId: user.figma_user_id, name: user.name },
      { expiresIn: '30d' },
    )

    return reply.send({ token })
  })
}
