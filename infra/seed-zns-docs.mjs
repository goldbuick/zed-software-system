/**
 * Seed docs.zns.zed.cafe from zss/rom/refscroll/*.md
 *
 * Usage:
 *   ZNS_EMAIL=you@example.com ZNS_TOKEN=... node infra/seed-zns-docs.mjs
 *
 * Log in first: #zns <email> docs  then  #zns <otp>
 */

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const refscrollDir = join(__dirname, '../zss/rom/refscroll')
const apex = process.env.ZNS_APEX ?? 'zns.zed.cafe'
const email = process.env.ZNS_EMAIL
const token = process.env.ZNS_TOKEN

if (!email || !token) {
  console.error('Set ZNS_EMAIL and ZNS_TOKEN')
  process.exit(1)
}

const files = readdirSync(refscrollDir).filter((f) => f.endsWith('.md'))

for (const file of files) {
  const key = file.replace(/\.md$/, '').toLowerCase()
  const body = readFileSync(join(refscrollDir, file), 'utf8')
  const formdata = new FormData()
  formdata.append('email', email)
  formdata.append('token', token)
  formdata.append('key', key)
  formdata.append('value', body)
  const res = await fetch(`https://${apex}/api/set`, {
    method: 'POST',
    body: formdata,
  })
  const json = await res.json()
  if (!json.success) {
    console.error(`failed ${key}:`, json.message ?? json)
    process.exit(1)
  }
  console.log(`ok ${key} (${body.length} chars)`)
}

console.log(`seeded ${files.length} keys to docs.${apex}`)
