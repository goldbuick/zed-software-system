#!/usr/bin/env node
/**
 * Validate cafe/public/wasm/lang against the ZSS corpus (parity + integration + book).
 * Run via: yarn lang-corpus:test
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { compilezss, createlangmodule, wasmartifactsmissing } from './lang-wasm.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const WASMDIR = path.join(ROOT, 'zss/feature/lang/backend/wasm')

function readmanifest(tier) {
  const paths = {
    parity: path.join(WASMDIR, '__fixtures__/parity/manifest.json'),
    integration: path.join(WASMDIR, '__fixtures__/integration/manifest.json'),
    book: path.join(WASMDIR, '__tests__/fixtures/coolregionsbow/manifest.json'),
  }
  return JSON.parse(readFileSync(paths[tier], 'utf8'))
}

function readdir(tier, id) {
  const dirs = {
    parity: path.join(WASMDIR, '__fixtures__/parity'),
    integration: path.join(WASMDIR, '__tests__/fixtures'),
    book: path.join(WASMDIR, '__tests__/fixtures/coolregionsbow'),
  }
  return readFileSync(path.join(dirs[tier], `${id}.zss`), 'utf8')
}

function iswasmmagic(bytes) {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x73 &&
    bytes[3] === 0x6d
  )
}

async function main() {
  if (wasmartifactsmissing()) {
    throw new Error('zss_lang.wasm missing — run yarn task run lang:build first')
  }

  const module = await createlangmodule()
  const tiers = [
    { name: 'parity', ids: readmanifest('parity') },
    { name: 'integration', ids: readmanifest('integration') },
    { name: 'book', ids: readmanifest('book') },
  ]

  let pass = 0
  let fail = 0
  const failures = []

  for (const tier of tiers) {
    for (const id of tier.ids) {
      const source = readdir(tier.name, id)
      const result = compilezss(id, source, module)
      let ok = true
      let reason = ''

      if (result.errors.length > 0) {
        ok = false
        reason = result.errors.map((e) => e.message).join('; ')
      } else if (!result.wasmbytes?.length) {
        ok = false
        reason = 'no wasm bytes'
      } else if (!iswasmmagic(result.wasmbytes)) {
        ok = false
        reason = 'bad wasm magic'
      }

      if (ok) {
        pass++
      } else {
        fail++
        failures.push(`${tier.name}/${id}: ${reason}`)
      }
    }
  }

  console.log(`lang corpus: pass=${pass} fail=${fail}`)
  if (failures.length) {
    for (const line of failures) {
      console.error(line)
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
