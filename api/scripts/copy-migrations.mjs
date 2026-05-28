import { cpSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src = join(root, 'src', 'migrations')
const dest = join(root, 'dist', 'migrations')

mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
console.log('Migrations copied to dist/migrations')
