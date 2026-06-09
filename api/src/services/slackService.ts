import { sql } from '../db/index.js'

export interface SlackPayload {
  frameName: string
  fileName: string
  publishedBy: string
  itemCount: number
  reviewId: string
}

interface SlackIntegrationRow {
  webhook_url: string
  enabled: boolean
}

export async function upsertWebhook(figmaUserId: string, webhookUrl: string): Promise<void> {
  await sql`
    INSERT INTO slack_integrations (user_id, webhook_url, enabled)
    SELECT id, ${webhookUrl}, true
    FROM users
    WHERE figma_user_id = ${figmaUserId}
    ON CONFLICT (user_id) DO UPDATE
      SET webhook_url = EXCLUDED.webhook_url,
          enabled     = true,
          updated_at  = NOW()
  `
}

export async function getWebhook(figmaUserId: string): Promise<string | null> {
  const [row] = await sql<{ webhook_url: string }[]>`
    SELECT si.webhook_url
    FROM slack_integrations si
    JOIN users u ON u.id = si.user_id
    WHERE u.figma_user_id = ${figmaUserId}
      AND si.enabled = true
  `
  return row?.webhook_url ?? null
}

export async function getIntegration(figmaUserId: string): Promise<{ webhookUrl: string; enabled: boolean } | null> {
  const [row] = await sql<SlackIntegrationRow[]>`
    SELECT si.webhook_url, si.enabled
    FROM slack_integrations si
    JOIN users u ON u.id = si.user_id
    WHERE u.figma_user_id = ${figmaUserId}
  `
  if (!row) return null
  return { webhookUrl: row.webhook_url, enabled: row.enabled }
}

export async function deleteWebhook(figmaUserId: string): Promise<void> {
  await sql`
    DELETE FROM slack_integrations
    WHERE user_id = (SELECT id FROM users WHERE figma_user_id = ${figmaUserId})
  `
}

export async function sendNotification(webhookUrl: string, payload: SlackPayload): Promise<boolean> {
  const body = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Novo review publicado* no Handoff',
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Frame:*\n${payload.frameName}` },
          { type: 'mrkdwn', text: `*Arquivo:*\n${payload.fileName}` },
          { type: 'mrkdwn', text: `*Publicado por:*\n${payload.publishedBy}` },
          { type: 'mrkdwn', text: `*Mudanças:*\n${payload.itemCount} itens` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Ver review' },
            url: `https://handoff-diff-tool.vercel.app/review/${payload.reviewId}`,
            style: 'primary',
          },
        ],
      },
    ],
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}
