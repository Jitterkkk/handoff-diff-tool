import type { FastifyInstance } from 'fastify'
import { checkDb } from '../db/index.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')) as { version: string }

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_req, reply) => {
    const dbOk = await checkDb()
    return reply.code(dbOk ? 200 : 503).send({
      status: dbOk ? 'ok' : 'error',
      version: pkg.version,
      uptime: process.uptime(),
      db: dbOk ? 'ok' : 'error',
    })
  })
}
