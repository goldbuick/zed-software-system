#!/usr/bin/env node
/**
 * Compile one ZSS source via Emscripten zss_lang; stdout JSON for tests.
 * Usage: node scripts/lang-wasm-compile-one.mjs <name> < file.zss
 */
import { readFileSync } from 'node:fs'

import { compilezss, createlangmodule } from './lang-wasm.mjs'

const name = process.argv[2] ?? 'cli'
const source = readFileSync(0, 'utf8')
const mod = await createlangmodule()
const result = compilezss(name, source, mod)

process.stdout.write(
  JSON.stringify({
    errors: result.errors,
    labelsjson: result.labelsjson,
    debugmap: result.debugmap,
    importmanifest: result.importmanifest,
    wasmbytes: Array.from(result.wasmbytes),
  }),
)
