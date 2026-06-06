#!/usr/bin/env node
/**
 * Side-by-side TS vs Emscripten WASM compile benchmark.
 * Run: yarn lang:bench:compile
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { compilezss, createlangmodule } from './lang-wasm.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const WASMDIR = path.join(ROOT, 'zss/feature/lang/backend/wasm')

function readzss(tier, id) {
  const dirs = {
    parity: path.join(WASMDIR, '__fixtures__/parity'),
    integration: path.join(WASMDIR, '__tests__/fixtures'),
    book: path.join(WASMDIR, '__tests__/fixtures/coolregionsbow'),
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
  return { median: median(samples) }
}

function formatms(ms) {
  return ms < 1 ? `${(ms * 1000).toFixed(0)} µs` : `${ms.toFixed(3)} ms`
}

function parsetsmedian(output) {
  const map = new Map()
  for (const line of output.split('\n')) {
    const match = line.match(/^\s*(\S+)\s+\d+\s+([\d.]+\s*(?:µs|ms))/)
    if (match) {
      map.set(match[1], match[2].trim())
    }
  }
  return map
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

console.log('Lang compile benchmark: TS vs Emscripten WASM\n')

const tsout = execSync(
  'yarn jest zss/feature/lang/backend/wasm/__tests__/compilebench.test.ts -t benchmark --no-coverage 2>&1',
  { cwd: ROOT, encoding: 'utf8', shell: true },
)
const tsmedians = parsetsmedian(tsout)

const loadstart = performance.now()
const mod = await createlangmodule()
const loadms = performance.now() - loadstart

const idwidth = Math.max(...cases.map((c) => c.id.length))
console.log(`WASM module load (one-time): ${formatms(loadms)}`)
console.log(`WASM iterations: ${iterations} (+ ${warmup} warmup)`)
console.log('')
console.log(
  `${'fixture'.padEnd(idwidth)}  lines   TS median   WASM median   speedup`,
)
console.log('-'.repeat(idwidth + 52))

for (const item of cases) {
  const lines = item.source.split('\n').length
  const wasm = bench(
    () => compilezss(item.name, item.source, mod),
    iterations,
    warmup,
  )
  const tsraw = tsmedians.get(item.id) ?? '?'
  const tsms = tsraw.includes('µs')
    ? parseFloat(tsraw) / 1000
    : parseFloat(tsraw)
  const speedup = Number.isFinite(tsms) ? (tsms / wasm.median).toFixed(1) : '?'
  console.log(
    `${item.id.padEnd(idwidth)}  ${String(lines).padStart(5)}   ${tsraw.padStart(9)}   ${formatms(wasm.median).padStart(11)}   ${speedup}x`,
  )
}

console.log('')
console.log('TS: Chevrotain parse + AST transform + new Function()')
console.log('WASM: C++ zss_compile via Emscripten (app:wasm:dev path)')
console.log('Speedup = TS median / WASM median (higher = WASM faster)')
