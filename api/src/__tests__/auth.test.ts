import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../server.js'
import { sql } from '../db/index.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
const TEST_USER = {
  figmaUserId: 'auth-test-user-001',
  name: 'Auth Test User',
  email: 'authtest@example.com',
}

beforeAll(async () => {
  app = await buildApp()
  await sql`DELETE FROM users WHERE figma_user_id = ${TEST_USER.figmaUserId}`
})

afterAll(async () => {
  await sql`DELETE FROM users WHERE figma_user_id = ${TEST_USER.figmaUserId}`
  await app.close()
})

describe('POST /auth/plugin', () => {
  it('cria usuário e retorna JWT válido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/plugin',
      payload: { figmaUserId: TEST_USER.figmaUserId, name: TEST_USER.name },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ token: string }>()
    expect(typeof body.token).toBe('string')
    expect(body.token.split('.').length).toBe(3)

    // Decodifica payload
    const payload = JSON.parse(Buffer.from(body.token.split('.')[1], 'base64url').toString())
    expect(payload.figmaUserId).toBe(TEST_USER.figmaUserId)
    expect(payload.name).toBe(TEST_USER.name)
  })

  it('faz upsert se o mesmo figmaUserId já existir', async () => {
    const res1 = await app.inject({
      method: 'POST',
      url: '/auth/plugin',
      payload: { figmaUserId: TEST_USER.figmaUserId, name: 'Old Name' },
    })
    const res2 = await app.inject({
      method: 'POST',
      url: '/auth/plugin',
      payload: { figmaUserId: TEST_USER.figmaUserId, name: 'New Name' },
    })
    expect(res1.statusCode).toBe(200)
    expect(res2.statusCode).toBe(200)

    const p2 = JSON.parse(Buffer.from(res2.json<{ token: string }>().token.split('.')[1], 'base64url').toString())
    expect(p2.name).toBe('New Name')
  })
})

describe('GET /auth/me', () => {
  let authToken: string

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/plugin',
      payload: { figmaUserId: TEST_USER.figmaUserId, name: TEST_USER.name },
    })
    authToken = res.json<{ token: string }>().token
  })

  it('retorna dados do usuário com JWT válido', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${authToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ figma_user_id: string; name: string }>()
    expect(body.figma_user_id).toBe(TEST_USER.figmaUserId)
    expect(body.name).toBe(TEST_USER.name)
  })

  it('retorna 401 sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/reviews sem token', () => {
  it('retorna 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/reviews?fileKey=test' })
    expect(res.statusCode).toBe(401)
  })
})
