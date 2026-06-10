import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  PublishReviewBodySchema,
  ListReviewsQuerySchema,
  PatchReviewItemBodySchema,
  PatchPublicReviewItemBodySchema,
  ReviewParamsSchema,
  ReviewItemParamsSchema,
} from '../schemas/review.js'
import { publishReview, listReviews, getReview, patchReviewItem, getPublicReview, patchPublicReviewItem, deleteReview, archiveReview } from '../services/reviewService.js'
import { getWebhook, sendNotification } from '../services/slackService.js'
import { redis } from '../redis/index.js'
import { rateLimit } from '../middleware/rateLimit.js'

export async function reviewsRoutes(app: FastifyInstance) {
  app.post('/api/reviews', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const body = PublishReviewBodySchema.parse(req.body)
    const review = await publishReview(body)
    const webhookUrl = await getWebhook(req.user.figmaUserId)
    if (webhookUrl) {
      sendNotification(webhookUrl, {
        reviewId: review.id,
        frameName: review.frame_name,
        fileName: body.fileName,
        publishedBy: req.user.name ?? 'Designer',
        itemCount: review.items.length,
      }).catch(() => {})
    }
    return reply.code(201).send(review)
  })

  app.get('/api/reviews', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const query = ListReviewsQuerySchema.parse(req.query)
    const page = await listReviews(req.user.figmaUserId, query.fileKey, query.status, query.limit, query.offset)
    return reply.send({
      ...page,
      hasMore: page.offset + page.reviews.length < page.total,
    })
  })

  app.get<{ Params: z.infer<typeof ReviewParamsSchema> }>('/api/reviews/:reviewId', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const { reviewId } = ReviewParamsSchema.parse(req.params)
    const review = await getReview(reviewId)
    if (!review) return reply.code(404).send({ error: 'Review not found' })
    return reply.send(review)
  })

  app.patch<{ Params: z.infer<typeof ReviewItemParamsSchema> }>('/api/reviews/:reviewId/items/:itemId', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const { reviewId, itemId } = ReviewItemParamsSchema.parse(req.params)
    const body = PatchReviewItemBodySchema.parse(req.body)
    const review = await patchReviewItem(reviewId, itemId, body.checked, body.checkedBy, body.comment)
    if (!review) return reply.code(404).send({ error: 'Review or item not found' })
    return reply.send(review)
  })

  app.delete<{ Params: z.infer<typeof ReviewParamsSchema> }>('/api/reviews/:reviewId', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const { reviewId } = ReviewParamsSchema.parse(req.params)
    const result = await deleteReview(reviewId, req.user.figmaUserId)
    if (result === 'not_found') return reply.code(404).send({ error: 'Review not found' })
    if (result === 'forbidden') return reply.code(403).send({ error: 'Access denied' })
    return reply.code(204).send()
  })

  app.patch<{ Params: z.infer<typeof ReviewParamsSchema> }>('/api/reviews/:reviewId/archive', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const { reviewId } = ReviewParamsSchema.parse(req.params)
    const result = await archiveReview(reviewId, req.user.figmaUserId)
    if (result === 'not_found') return reply.code(404).send({ error: 'Review not found' })
    if (result === 'forbidden') return reply.code(403).send({ error: 'Access denied' })
    return reply.send(result)
  })

  // Rotas públicas — sem autenticação
  app.get<{ Params: z.infer<typeof ReviewParamsSchema> }>('/api/reviews/:reviewId/public', async (req, reply) => {
    const rawForwarded = req.headers['x-forwarded-for']
    const ip = req.ip || (Array.isArray(rawForwarded) ? rawForwarded[0] : rawForwarded) || 'unknown'
    try {
      const { allowed } = await rateLimit(redis, ip, 'public-review-get', 60)
      if (!allowed) return reply.code(429).send({ error: 'Too many requests. Try again in a minute.' })
    } catch { /* Redis unavailable — allow */ }
    const { reviewId } = ReviewParamsSchema.parse(req.params)
    const review = await getPublicReview(reviewId)
    if (!review) return reply.code(404).send({ error: 'Review not found' })
    return reply.send(review)
  })

  app.patch<{ Params: z.infer<typeof ReviewItemParamsSchema> }>('/api/reviews/:reviewId/items/:itemId/public', async (req, reply) => {
    const rawForwarded = req.headers['x-forwarded-for']
    const ip = req.ip || (Array.isArray(rawForwarded) ? rawForwarded[0] : rawForwarded) || 'unknown'
    try {
      const { allowed } = await rateLimit(redis, ip, 'public-review-patch', 30)
      if (!allowed) return reply.code(429).send({ error: 'Too many requests. Try again in a minute.' })
    } catch { /* Redis unavailable — allow */ }
    const { reviewId, itemId } = ReviewItemParamsSchema.parse(req.params)
    const body = PatchPublicReviewItemBodySchema.parse(req.body)
    const item = await patchPublicReviewItem(reviewId, itemId, body.checked, body.comment)
    if (!item) return reply.code(404).send({ error: 'Review item not found' })
    return reply.send(item)
  })
}
