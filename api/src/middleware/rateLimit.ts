import type { Redis } from '@upstash/redis'

export async function rateLimit(
  client: Redis,
  ip: string,
  route: string,
  limit = 30,
  windowSecs = 60,
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${ip}:${route}`
  const current = await client.incr(key)
  if (current === 1) {
    await client.expire(key, windowSecs)
  }
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
  }
}
