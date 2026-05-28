import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../server.js'
import { sql } from '../db/index.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let authToken: string

const TEST_FILE_KEY = 'test-file-key-reviews'
const TEST_USER = {
  figmaUserId: 'test-user-001',
  name: 'Test Designer',
  email: 'test@example.com',
}

const SAMPLE_ITEMS = [
  { nodeId: 'node-1', nodeName: 'Button', type: 'COLOR', severity: 'high' as const, before: '#fff', after: '#000' },
  { nodeId: 'node-2', nodeName: 'Text', type: 'TYPOGRAPHY', severity: 'medium' as const, before: '14px', after: '16px' },
  { nodeId: 'node-3', nodeName: 'Card', type: 'SIZE', severity: 'low' as const, before: 100, after: 120 },
]

beforeAll(async () => {
  app = await buildApp()

  // Clean up test data
  await sql`DELETE FROM reviews USING files WHERE reviews.file_id = files.id AND files.figma_file_key = ${TEST_FILE_KEY}`
  await sql`DELETE FROM files WHERE figma_file_key = ${TEST_FILE_KEY}`
  await sql`DELETE FROM users WHERE figma_user_id = ${TEST_USER.figmaUserId}`

  authToken = app.jwt.sign({ figmaUserId: TEST_USER.figmaUserId, name: TEST_USER.name })
})

afterAll(async () => {
  await sql`DELETE FROM reviews USING files WHERE reviews.file_id = files.id AND files.figma_file_key = ${TEST_FILE_KEY}`
  await sql`DELETE FROM files WHERE figma_file_key = ${TEST_FILE_KEY}`
  await sql`DELETE FROM users WHERE figma_user_id = ${TEST_USER.figmaUserId}`
  await app.close()
})

describe('POST /api/reviews', () => {
  it('creates a review with items and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        fileKey: TEST_FILE_KEY,
        fileName: 'Test File',
        frameId: 'frame-001',
        frameName: 'Login Screen',
        description: 'Updated colors and spacing',
        publishedBy: TEST_USER,
        items: SAMPLE_ITEMS,
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json<{ id: string; status: string; total_items: number; items: unknown[] }>()
    expect(body.status).toBe('pending')
    expect(body.total_items).toBe(3)
    expect(body.items).toHaveLength(3)
  })

  it('returns 401 without auth token', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/reviews', payload: {} })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 with empty items array', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        fileKey: TEST_FILE_KEY,
        fileName: 'Test File',
        frameId: 'frame-001',
        frameName: 'Login Screen',
        publishedBy: TEST_USER,
        items: [],
      },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/reviews', () => {
  it('returns list of reviews for a file', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/reviews?fileKey=${TEST_FILE_KEY}`,
      headers: { authorization: `Bearer ${authToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<unknown[]>()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })
})

describe('PATCH /api/reviews/:reviewId/items/:itemId — status transitions', () => {
  let reviewId: string
  let itemIds: string[]

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        fileKey: TEST_FILE_KEY,
        fileName: 'Test File',
        frameId: 'frame-002',
        frameName: 'Profile Screen',
        publishedBy: TEST_USER,
        items: SAMPLE_ITEMS,
      },
    })
    const body = res.json<{ id: string; items: { id: string }[] }>()
    reviewId = body.id
    itemIds = body.items.map((i) => i.id)
  })

  it('starts as pending', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/reviews/${reviewId}`,
      headers: { authorization: `Bearer ${authToken}` },
    })
    expect(res.json<{ status: string }>().status).toBe('pending')
  })

  it('transitions to in_progress after checking one item', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/reviews/${reviewId}/items/${itemIds[0]}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { checked: true, checkedBy: { figmaUserId: 'dev-001', name: 'Dev User' } },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ status: string }>().status).toBe('in_progress')
  })

  it('transitions to done after checking all items', async () => {
    for (const id of itemIds.slice(1)) {
      await app.inject({
        method: 'PATCH',
        url: `/api/reviews/${reviewId}/items/${id}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: { checked: true },
      })
    }
    const res = await app.inject({
      method: 'GET',
      url: `/api/reviews/${reviewId}`,
      headers: { authorization: `Bearer ${authToken}` },
    })
    expect(res.json<{ status: string }>().status).toBe('done')
  })
})
