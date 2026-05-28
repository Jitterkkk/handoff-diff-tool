import { Redis } from '@upstash/redis'
import { config } from '../config.js'

export const redis = new Redis({
  url: config.UPSTASH_REDIS_REST_URL,
  token: config.UPSTASH_REDIS_REST_TOKEN,
})

export async function publishEvent(channel: string, payload: unknown): Promise<void> {
  await redis.publish(channel, JSON.stringify(payload))
}
