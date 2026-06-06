#!/usr/bin/env node
/**
 * Compile a .zss file with the C++ lang compiler (zss_lang.wasm) and print JS to stdout.
 *
 * Usage:
 *   yarn compile:lang path/to/script.zss
 *   yarn compile:lang -- path/to/script.zss
 *   cat script.zss | yarn compile:lang -
 *
 * Requires: yarn build:lang (once)
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  compilezss,
  createlangmodule,
  wasmartifactsmissing,
} from './lang-wasm.mjs'

function usage() {
  process.stderr.write(
    'usage: yarn compile:lang <file.zss|->\n  compile ZSS source to JS (stdout) via zss_lang.wasm\n',
  )
}

async function main() {
  const arg = process.argv[2]
  if (!arg || arg === '--help' || arg === '-h') {
    usage()
    process.exit(arg ? 0 : 1)
  }

  if (wasmartifactsmissing()) {
    process.stderr.write(
      'error: zss_lang.wasm not found — run yarn build:lang first\n',
    )
    process.exit(1)
  }

  let source
  let name
  if (arg === '-') {
    source = readFileSync(0, 'utf8')
    name = 'stdin'
  } else {
    const filepath = path.resolve(arg)
    source = readFileSync(filepath, 'utf8')
    name = path.basename(filepath, path.extname(filepath)) || 'script'
  }

  const module = await createlangmodule()
  const result = compilezss(name, source, module)

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      process.stderr.write(
        `${err.line}:${err.column}: ${err.message}\n`,
      )
    }
    process.exit(1)
  }

  process.stdout.write(result.source)
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : err}\n`)
  process.exit(1)
})
