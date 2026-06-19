import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db/index.js'
import { redis } from '../redis/index.js'
import { config } from '../config.js'
import type { DbUser } from '../types/index.js'
import { registerWithEmail, loginWithEmail, EmailAlreadyExistsError } from '../services/authService.js'

const PluginAuthBodySchema = z.object({
  figmaUserId: z.string().min(1),
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
})

const RegisterBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

interface FigmaTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface FigmaUserResponse {
  id: string
  email: string
  handle: string
  img_url: string
}

export async function authRoutes(app: FastifyInstance) {
  // ── POST /auth/plugin — autenticação do plugin Figma ──────────────────────
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

  // ── GET /auth/me — retorna usuário autenticado ────────────────────────────
  app.get('/auth/me', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const [user] = await sql<DbUser[]>`
      SELECT * FROM users WHERE figma_user_id = ${req.user.figmaUserId}
    `
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return reply.send({
      id: user.id,
      figma_user_id: user.figma_user_id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
    })
  })

  // ── GET /auth/figma — inicia OAuth com o Figma ────────────────────────────
  app.get('/auth/figma', async (_req, reply) => {
    if (!config.FIGMA_CLIENT_ID) {
      return reply.code(503).send({ error: 'Figma OAuth not configured' })
    }

    const state = crypto.randomUUID()
    await redis.set(`oauth:state:${state}`, '1', { ex: 600 })

    const redirectUri = 'https://handoff-api.onrender.com/auth/figma/callback'
    const params = new URLSearchParams({
      client_id: config.FIGMA_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'current_user:read',
      state,
      response_type: 'code',
    })

    return reply.redirect(`https://www.figma.com/oauth?${params.toString()}`)
  })

  // ── GET /auth/figma/callback — recebe o code do Figma ────────────────────
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/auth/figma/callback',
    async (req, reply) => {
      const { code, state, error } = req.query

      if (error || !code || !state) {
        return reply.redirect(`${config.FRONTEND_URL}/login?error=oauth_denied`)
      }

      // Valida state no Redis
      const stored = await redis.get(`oauth:state:${state}`)
      if (!stored) {
        return reply.code(400).send({ error: 'Invalid or expired OAuth state' })
      }
      await redis.del(`oauth:state:${state}`)

      // Troca code por access_token
      const tokenRes = await fetch('https://api.figma.com/v1/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.FIGMA_CLIENT_ID,
          client_secret: config.FIGMA_CLIENT_SECRET,
          redirect_uri: 'https://handoff-api.onrender.com/auth/figma/callback',
          code,
        }).toString(),
      })

      if (!tokenRes.ok) {
        const err = await tokenRes.text()
        app.log.error({ err }, 'Figma token exchange failed')
        return reply.redirect(`${config.FRONTEND_URL}/login?error=token_exchange`)
      }

      const { access_token } = await tokenRes.json() as FigmaTokenResponse

      // Busca perfil do usuário
      const meRes = await fetch('https://api.figma.com/v1/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      })

      if (!meRes.ok) {
        return reply.redirect(`${config.FRONTEND_URL}/login?error=profile_fetch`)
      }

      const figmaUser = await meRes.json() as FigmaUserResponse

      // Upsert do usuário no banco
      const [user] = await sql<DbUser[]>`
        INSERT INTO users (figma_user_id, name, email, avatar_url)
        VALUES (${figmaUser.id}, ${figmaUser.handle}, ${figmaUser.email ?? null}, ${figmaUser.img_url ?? null})
        ON CONFLICT (figma_user_id) DO UPDATE
          SET name       = EXCLUDED.name,
              email      = COALESCE(EXCLUDED.email, users.email),
              avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
              updated_at = NOW()
        RETURNING *
      `

      // Gera JWT
      const jwt = app.jwt.sign(
        { figmaUserId: user.figma_user_id, name: user.name },
        { expiresIn: '30d' },
      )

      return reply.redirect(`${config.FRONTEND_URL}/auth/callback?token=${jwt}`)
    },
  )

  // ── POST /auth/register — registro com email/senha ───────────────────────
  app.post('/auth/register', async (req, reply) => {
    const { email, password, name } = RegisterBodySchema.parse(req.body)
    try {
      const user = await registerWithEmail(email, password, name)
      const token = app.jwt.sign(
        { figmaUserId: user.figmaUserId, name: user.name },
        { expiresIn: '30d' },
      )
      return reply.code(201).send({ token })
    } catch (err) {
      if (err instanceof EmailAlreadyExistsError) {
        return reply.code(409).send({ error: 'Email already registered' })
      }
      throw err
    }
  })

  // ── POST /auth/login — login com email/senha ──────────────────────────────
  app.post('/auth/login', async (req, reply) => {
    const { email, password } = LoginBodySchema.parse(req.body)
    const user = await loginWithEmail(email, password)
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' })
    const token = app.jwt.sign(
      { figmaUserId: user.figmaUserId, name: user.name },
      { expiresIn: '30d' },
    )
    return reply.send({ token })
  })
}
