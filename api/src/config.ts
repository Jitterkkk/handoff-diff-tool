import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_TEST: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FIGMA_CLIENT_ID: z.string().default(''),
  FIGMA_CLIENT_SECRET: z.string().default(''),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  API_BASE: z.string().url().default('http://localhost:3001'),
})

function loadConfig() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map(i => i.path.join('.')).join(', ')
    throw new Error(`Invalid environment variables: ${missing}\n${result.error.message}`)
  }

  const data = result.data

  if (data.NODE_ENV === 'production') {
    if (data.JWT_SECRET === 'change-me-in-production') {
      throw new Error('JWT_SECRET must be changed in production')
    }
    if (!data.FIGMA_CLIENT_ID) throw new Error('FIGMA_CLIENT_ID is required in production')
    if (!data.FIGMA_CLIENT_SECRET) throw new Error('FIGMA_CLIENT_SECRET is required in production')
  }

  return data
}

export const config = loadConfig()
export type Config = typeof config
