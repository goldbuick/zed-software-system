#!/usr/bin/env node
/** Compare Emscripten (cafe/public) vs subprocess compile for one script. */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { compilezss, createlangmodule } from './lang-wasm.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(
  path.join(
    ROOT,
    'zss/feature/lang/backend/wasm/__tests__/fixtures/simple_chat_player.zss',
  ),
  'utf8',
)

const mod = await createlangmodule()
const browser = compilezss('player', source, mod)

const { execSync } = await import('node:child_process')
const cli = JSON.parse(
  execSync('node scripts/lang-wasm-compile-one.mjs player', {
    input: source,
    cwd: ROOT,
  }).toString(),
)

function digest(bytes) {
  let h = 0
  for (let i = 0; i < bytes.length; i++) {
    h = (h * 31 + (bytes[i] & 0xff)) >>> 0
  }
  return `${bytes.length}:${h.toString(16)}`
}

const browserbytes = browser.wasmbytes
const clibytes = Uint8Array.from(cli.wasmbytes)

console.log('wasm bytes match', digest(browserbytes) === digest(clibytes))
console.log('browser', digest(browserbytes))
console.log('cli', digest(clibytes))
console.log('labelsjson match', browser.labelsjson === cli.labelsjson)
if (browser.labelsjson !== cli.labelsjson) {
  const bl = JSON.parse(browser.labelsjson)
  const cl = JSON.parse(cli.labelsjson)
  for (const k of Object.keys(bl)) {
    if (JSON.stringify(bl[k]) !== JSON.stringify(cl[k])) {
      console.log('label diff', k, bl[k], cl[k])
    }
  }
}
