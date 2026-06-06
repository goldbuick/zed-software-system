#!/usr/bin/env node
/**
 * Smoke test: load zss_lang.wasm and compile empty fixture.
 * Run via: yarn lang-wasm:test
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { compilezss, createlangmodule } from './lang-wasm.mjs'

const FIXTUREDIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../zss/feature/lang/backend/wasm/__fixtures__/parity',
)

async function main() {
  const module = await createlangmodule()
  const result = compilezss('empty', '', module)

  if (result.errors.length > 0) {
    throw new Error(`zss_compile returned ${result.errors.length} errors`)
  }

  const expected = readFileSync(path.join(FIXTUREDIR, 'empty.js'), 'utf8')
  if (result.source !== expected) {
    throw new Error('wasm compile output mismatch for empty.zss')
  }

  console.log('lang wasm smoke ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
