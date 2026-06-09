import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import { config } from './config.js'
import { healthRoutes } from './routes/health.js'
import { reviewsRoutes } from './routes/reviews.js'
import { filesRoutes } from './routes/files.js'
import { authRoutes } from './routes/auth.js'
import { slackRoutes } from './routes/slack.js'
import { ZodError } from 'zod'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { figmaUserId: string; name: string }
    user: { figmaUserId: string; name: string }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>
  }
}

export async function buildApp() {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test',
  })

  await app.register(helmet)
  await app.register(cors, {
    origin: (origin, callback) => {
      const allowed = [
        config.FRONTEND_URL,
        'http://localhost:3000',
      ]
      if (!origin || origin === 'null' || allowed.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'), false)
      }
    },
  })
  await app.register(jwt, { secret: config.JWT_SECRET })

  app.decorate('authenticate', async (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
    try {
      await req.jwtVerify()
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  })

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'Validation error', issues: err.issues })
    }
    app.log.error(err)
    const status = (err as { statusCode?: number }).statusCode ?? 500
    const message = (err as Error).message ?? 'Internal Server Error'
    return reply.code(status).send({ error: message })
  })

  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(reviewsRoutes)
  await app.register(filesRoutes)
  await app.register(slackRoutes)

  return app
}

if (process.env['NODE_ENV'] !== 'test') {
  const app = await buildApp()
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  console.log(`handoff-api listening on :${config.PORT}`)
}
