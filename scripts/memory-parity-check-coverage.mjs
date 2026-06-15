#!/usr/bin/env node
/**
 * Verify memory parity fixture manifest covers all in-scope memory tests.
 * yarn memory:parity:check-coverage
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const TESTDIR = path.join(ROOT, 'zss/memory/__tests__')
const FIXTUREDIR = path.join(ROOT, 'fixtures/memory/wasm')
const REGEN = path.join(ROOT, 'zss/memory/wasm/regenfixtures.test.ts')
const EXCLUDED = new Set(['adminconfig.test.ts'])

function parsemanifest() {
  const src = readFileSync(REGEN, 'utf8')
  const start = src.indexOf('export const FIXTURE_MANIFEST')
  if (start < 0) {
    throw new Error('FIXTURE_MANIFEST not found in regenfixtures.test.ts')
  }
  const brace = src.indexOf('{', start)
  let depth = 0
  let end = brace
  for (; end < src.length; ++end) {
    const ch = src[end]
    if (ch === '{') {
      ++depth
    } else if (ch === '}') {
      --depth
      if (depth === 0) {
        break
      }
    }
  }
  const literal = src.slice(brace, end + 1)
  // eslint-disable-next-line no-new-func
  return Function(`return (${literal})`)()
}

function main() {
  const manifest = parsemanifest()
  const testfiles = readdirSync(TESTDIR)
    .filter((f) => f.endsWith('.test.ts'))
    .sort()
  const inscope = testfiles.filter((f) => !EXCLUDED.has(f))
  const manifestkeys = Object.keys(manifest).sort()

  let failed = false

  for (const file of inscope) {
    if (!manifest[file]) {
      console.error(`missing manifest entry for ${file}`)
      failed = true
    }
  }

  for (const file of manifestkeys) {
    if (EXCLUDED.has(file)) {
      console.error(`manifest should not include excluded ${file}`)
      failed = true
      continue
    }
    if (!testfiles.includes(file)) {
      console.error(`manifest references unknown test file ${file}`)
      failed = true
    }
  }

  const allfixtures = Object.values(manifest).flat()
  const ondisk = readdirSync(FIXTUREDIR).filter((f) => f.endsWith('.json'))
  const expectednames = new Set(allfixtures.map((n) => `${n}.json`))

  for (const name of allfixtures) {
    const file = `${name}.json`
    if (!ondisk.includes(file)) {
      console.error(`fixture missing on disk: ${file}`)
      failed = true
    }
  }

  for (const file of ondisk) {
    if (!expectednames.has(file)) {
      console.error(`orphan fixture not in manifest: ${file}`)
      failed = true
    }
  }

  if (failed) {
    process.exit(1)
  }

  console.log(
    `memory parity coverage ok: ${inscope.length} test files, ${allfixtures.length} fixtures`,
  )
}

if (!existsSync(FIXTUREDIR)) {
  console.error('fixture dir missing; run yarn memory:parity:regen first')
  process.exit(1)
}

main()
