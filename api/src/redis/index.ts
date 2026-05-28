import Redis from 'ioredis'
import { config } from '../config.js'

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
})

redis.on('error', (err) => {
  if (config.NODE_ENV !== 'test') {
    console.error('[redis] connection error:', err.message)
  }
})

export async function publishEvent(channel: string, payload: unknown): Promise<void> {
  await redis.publish(channel, JSON.stringify(payload))
}
