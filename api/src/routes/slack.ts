import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { upsertWebhook, getWebhook, getIntegration, deleteWebhook, sendNotification } from '../services/slackService.js'

const WebhookBodySchema = z.object({
  webhookUrl: z
    .string()
    .url()
    .refine(url => url.startsWith('https://hooks.slack.com/'), {
      message: 'Must be a valid Slack incoming webhook URL',
    }),
})

export async function slackRoutes(app: FastifyInstance) {
  app.get('/api/slack/webhook', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const integration = await getIntegration(req.user.figmaUserId)
    return reply.send(integration)
  })

  app.post('/api/slack/webhook', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const { webhookUrl } = WebhookBodySchema.parse(req.body)
    await upsertWebhook(req.user.figmaUserId, webhookUrl)
    return reply.code(200).send({ ok: true })
  })

  app.delete('/api/slack/webhook', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    await deleteWebhook(req.user.figmaUserId)
    return reply.code(204).send()
  })

  app.post('/api/slack/test', {
    onRequest: [app.authenticate],
  }, async (req, reply) => {
    const webhookUrl = await getWebhook(req.user.figmaUserId)
    if (!webhookUrl) {
      return reply.code(400).send({ error: 'No Slack webhook configured or integration is disabled' })
    }
    const success = await sendNotification(webhookUrl, {
      frameName: 'Frame de Teste',
      fileName: 'Arquivo de Teste',
      publishedBy: req.user.name,
      itemCount: 3,
      reviewId: 'test-notification',
    })
    return reply.send({ success })
  })
}
