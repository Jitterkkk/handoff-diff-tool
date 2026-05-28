import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import { sql } from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  const migrationsDir = join(__dirname, '..', 'migrations')
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const existing = await sql`
      SELECT id FROM _migrations WHERE name = ${file}
    `
    if (existing.length > 0) {
      console.log(`  skip  ${file}`)
      continue
    }

    const sqlContent = readFileSync(join(migrationsDir, file), 'utf8')
    await sql.unsafe(sqlContent)
    await sql`INSERT INTO _migrations (name) VALUES (${file})`
    console.log(`  apply ${file}`)
  }

  console.log('Migrations complete.')
  await sql.end()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
