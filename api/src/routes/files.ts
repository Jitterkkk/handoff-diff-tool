import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getFileMembers, listFiles, checkFileAccess } from '../services/fileService.js'
import { listReviews } from '../services/reviewService.js'
import { ListReviewsQuerySchema } from '../schemas/review.js'

const FileParamsSchema = z.object({
  fileKey: z.string().min(1),
})

export async function filesRoutes(app: FastifyInstance) {
  app.get('/api/files', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const files = await listFiles(req.user.figmaUserId)
    return reply.send(files)
  })

  app.get<{ Params: z.infer<typeof FileParamsSchema> }>('/api/files/:fileKey/reviews', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const { fileKey } = FileParamsSchema.parse(req.params)
    const query = ListReviewsQuerySchema.parse(req.query)
    const hasAccess = await checkFileAccess(req.user.figmaUserId, fileKey)
    if (!hasAccess) return reply.code(404).send({ error: 'File not found' })
    const page = await listReviews(req.user.figmaUserId, fileKey, query.status, query.limit, query.offset)
    return reply.send({ ...page, hasMore: page.offset + page.reviews.length < page.total })
  })

  app.get<{ Params: { fileKey: string } }>('/api/files/:fileKey/members', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const { fileKey } = req.params
    const members = await getFileMembers(fileKey)
    return reply.send(members)
  })
}
