#!/usr/bin/env node
/**
 * Smoke test: load zss_lang.wasm and compile empty fixture.
 * Run via: yarn lang-wasm:test
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { compilezss, createlangmodule } from '../../lib/lang/lang-wasm.mjs'

const FIXTUREDIR = path.join(process.cwd(), 'ops/fixtures/lang/parity')

async function main() {
  const module = await createlangmodule()
  const empty = readFileSync(path.join(FIXTUREDIR, 'empty.zss'), 'utf8')
  const result = compilezss('empty', empty, module)

  if (result.errors.length > 0) {
    throw new Error(`zss_compile returned ${result.errors.length} errors`)
  }

  if (!result.wasmbytes || result.wasmbytes.length < 8) {
    throw new Error('zss_compile returned no wasm_bytes')
  }

  if (
    result.wasmbytes[0] !== 0x00 ||
    result.wasmbytes[1] !== 0x61 ||
    result.wasmbytes[2] !== 0x73 ||
    result.wasmbytes[3] !== 0x6d
  ) {
    throw new Error('wasm_bytes missing magic')
  }

  console.log('lang wasm smoke ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
