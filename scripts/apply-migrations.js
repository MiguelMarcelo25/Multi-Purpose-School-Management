// Apply SQL migrations from the supabase/ folder, in numeric order, against
// the database referenced by DATABASE_URL.
//
// Usage:  node scripts/apply-migrations.js
//
// One-shot helper — the project's documented workflow is to paste these into
// the Supabase SQL Editor. This runner exists to make first-time setup
// scriptable without leaving the terminal.

import pg from 'pg'
import dotenv from 'dotenv'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config()

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '..', 'supabase')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('Missing DATABASE_URL in .env')
  process.exit(1)
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

if (files.length === 0) {
  console.error(`No .sql files found in ${migrationsDir}`)
  process.exit(1)
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log('Connecting to Postgres…')
  await client.connect()
  console.log('Connected.\n')

  for (const file of files) {
    const path = join(migrationsDir, file)
    const sql = readFileSync(path, 'utf8')
    console.log(`▶ Applying ${file} (${sql.length.toLocaleString()} chars)…`)
    try {
      await client.query(sql)
      console.log(`  ✓ ${file} applied`)
    } catch (err) {
      console.error(`  ✗ ${file} failed:`)
      console.error(`    ${err.message}`)
      throw err
    }
  }

  console.log('\n✓ All migrations applied.')
}

main()
  .catch((err) => {
    console.error('\n✗ Migration run failed:')
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await client.end()
  })
