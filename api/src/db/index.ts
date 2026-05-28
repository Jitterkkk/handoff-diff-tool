import postgres from 'postgres'
import { config } from '../config.js'

const dbUrl = config.NODE_ENV === 'test' && config.DATABASE_URL_TEST
  ? config.DATABASE_URL_TEST
  : config.DATABASE_URL

export const sql = postgres(dbUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
})

export async function checkDb(): Promise<boolean> {
  try {
    await sql`SELECT 1`
    return true
  } catch {
    return false
  }
}
