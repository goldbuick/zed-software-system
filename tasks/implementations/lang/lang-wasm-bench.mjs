#!/usr/bin/env node
/** Emscripten zss_compile wall time (browser WASM path). Run: node scripts/lang-wasm-bench.mjs */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { compilezss, createlangmodule } from '../../lib/lang/lang-wasm.mjs'

const ROOT = process.cwd()
const FIXTURES = path.join(ROOT, 'ops/fixtures')

function readzss(tier, id) {
  const dirs = {
    parity: path.join(FIXTURES, 'lang/parity'),
    integration: path.join(FIXTURES, 'lang/scripts'),
    book: path.join(FIXTURES, 'lang/coolregionsbow'),
  }
  return readFileSync(path.join(dirs[tier], `${id}.zss`), 'utf8')
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function bench(fn, iterations, warmup) {
  for (let i = 0; i < warmup; i++) fn()
  const samples = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    samples.push(performance.now() - start)
  }
  return { median: median(samples), min: Math.min(...samples), max: Math.max(...samples) }
}

function formatms(ms) {
  return ms < 1 ? `${(ms * 1000).toFixed(0)} µs` : `${ms.toFixed(3)} ms`
}

const cases = [
  { id: 'drawdisplay', name: 'drawpass', source: readzss('parity', 'drawdisplay') },
  { id: 'short_go', name: 'short_go', source: readzss('parity', 'short_go') },
  {
    id: 'simple_chat_player',
    name: 'player',
    source: readzss('integration', 'simple_chat_player'),
  },
  { id: 'duplicator', name: 'duplicator', source: readzss('book', 'duplicator') },
  { id: 'player', name: 'player', source: readzss('book', 'player') },
]

const iterations = 50
const warmup = 5

const loadstart = performance.now()
const mod = await createlangmodule()
const loadms = performance.now() - loadstart

console.log('Emscripten WASM compile benchmark (app:wasm:dev path)')
console.log(`Module load (one-time): ${formatms(loadms)}`)
console.log(`Iterations: ${iterations} (+ ${warmup} warmup)`)
console.log('')

const idwidth = Math.max(...cases.map((c) => c.id.length))
console.log(`${'fixture'.padEnd(idwidth)}  lines   median    min       max       wasm bytes`)
console.log('-'.repeat(idwidth + 55))

for (const item of cases) {
  const lines = item.source.split('\n').length
  const sample = compilezss(item.name, item.source, mod)
  const timing = bench(
    () => compilezss(item.name, item.source, mod),
    iterations,
    warmup,
  )
  console.log(
    `${item.id.padEnd(idwidth)}  ${String(lines).padStart(5)}   ${formatms(timing.median).padStart(9)}   ${formatms(timing.min).padStart(9)}   ${formatms(timing.max).padStart(9)}   ${sample.wasmbytes.length} B`,
  )
}
