import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { sql } from '../db/index.js'
import type { DbUser } from '../types/index.js'

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super('Email already registered')
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
): Promise<{ id: string; email: string; name: string; figmaUserId: string }> {
  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM users WHERE email_verified = ${email}
  `
  if (existing) throw new EmailAlreadyExistsError()

  const hash = await bcrypt.hash(password, 12)
  const syntheticFigmaId = randomUUID()

  const [user] = await sql<DbUser[]>`
    INSERT INTO users (figma_user_id, name, email_verified, password_hash, auth_provider)
    VALUES (${syntheticFigmaId}, ${name}, ${email}, ${hash}, 'email')
    RETURNING *
  `

  return {
    id: user.id,
    email: user.email_verified!,
    name: user.name,
    figmaUserId: user.figma_user_id,
  }
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<{ id: string; figmaUserId: string; name: string } | null> {
  const [user] = await sql<DbUser[]>`
    SELECT * FROM users WHERE email_verified = ${email} AND auth_provider = 'email'
  `
  if (!user || !user.password_hash) return null

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) return null

  return { id: user.id, figmaUserId: user.figma_user_id, name: user.name }
}
