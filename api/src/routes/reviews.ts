import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  PublishReviewBodySchema,
  ListReviewsQuerySchema,
  PatchReviewItemBodySchema,
  ReviewParamsSchema,
  ReviewItemParamsSchema,
} from '../schemas/review.js'
import { publishReview, listReviews, getReview, patchReviewItem, getPublicReview, patchPublicReviewItem } from '../services/reviewService.js'

export async function reviewsRoutes(app: FastifyInstance) {
  app.post('/api/reviews', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const body = PublishReviewBodySchema.parse(req.body)
    const review = await publishReview(body)
    return reply.code(201).send(review)
  })

  app.get('/api/reviews', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const query = ListReviewsQuerySchema.parse(req.query)
    const reviews = await listReviews(req.user.figmaUserId, query.fileKey, query.status)
    return reply.send(reviews)
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
    const review = await patchReviewItem(reviewId, itemId, body.checked, body.checkedBy)
    if (!review) return reply.code(404).send({ error: 'Review or item not found' })
    return reply.send(review)
  })

  // Rotas públicas — sem autenticação
  app.get<{ Params: z.infer<typeof ReviewParamsSchema> }>('/api/reviews/:reviewId/public', async (req, reply) => {
    const { reviewId } = ReviewParamsSchema.parse(req.params)
    const review = await getPublicReview(reviewId)
    if (!review) return reply.code(404).send({ error: 'Review not found' })
    return reply.send(review)
  })

  app.patch<{ Params: z.infer<typeof ReviewItemParamsSchema> }>('/api/reviews/:reviewId/items/:itemId/public', async (req, reply) => {
    const { reviewId, itemId } = ReviewItemParamsSchema.parse(req.params)
    const body = PatchReviewItemBodySchema.parse(req.body)
    const item = await patchPublicReviewItem(reviewId, itemId, body.checked)
    if (!item) return reply.code(404).send({ error: 'Review item not found' })
    return reply.send(item)
  })
}
