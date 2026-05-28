import type { FastifyInstance } from 'fastify'
import { getFileMembers } from '../services/fileService.js'

export async function filesRoutes(app: FastifyInstance) {
  app.get<{ Params: { fileKey: string } }>('/api/files/:fileKey/members', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const { fileKey } = req.params
    const members = await getFileMembers(fileKey)
    return reply.send(members)
  })
}
