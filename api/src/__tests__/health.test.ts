import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../server.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
})

afterAll(async () => {
  await app.close()
})

describe('GET /health', () => {
  it('returns 200 with status ok when db is reachable', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ status: string; version: string; db: string }>()
    expect(body.status).toBe('ok')
    expect(body.db).toBe('ok')
    expect(typeof body.version).toBe('string')
  })
})
