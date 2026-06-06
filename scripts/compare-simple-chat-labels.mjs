#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import { compilezss, createlangmodule } from './lang-wasm.mjs'

const require = createRequire(import.meta.url)
const { compile } = require('../zss/feature/lang/index.ts')

const source = readFileSync(
  '../zss/feature/lang/backend/wasm/__tests__/fixtures/simple_chat_player.zss',
  'utf8',
)

const js = compile('player', source)
const mod = await createlangmodule()
const cpp = compilezss('player', source, mod)
const cppl = JSON.parse(cpp.labelsjson)

console.log('TS think', js.labels?.think)
console.log('CPP think', cppl.think)
console.log('equal', JSON.stringify(js.labels) === JSON.stringify(cppl))
const tskeys = new Set(Object.keys(js.labels ?? {}))
const cppkeys = new Set(Object.keys(cppl))
console.log('only TS', [...tskeys].filter((k) => !cppkeys.has(k)))
console.log('only CPP', [...cppkeys].filter((k) => !tskeys.has(k)))
for (const k of [...tskeys].filter((k) => cppkeys.has(k))) {
  if (JSON.stringify(js.labels[k]) !== JSON.stringify(cppl[k])) {
    console.log('diff', k, js.labels[k], cppl[k])
  }
}
