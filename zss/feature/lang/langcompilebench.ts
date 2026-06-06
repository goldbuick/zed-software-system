import { compile } from 'zss/feature/lang/backend/typescript/generator'
import {
  compilezssonmodule,
  createlangmodule,
} from 'zss/feature/lang/langwasmload'

import drawdisplaysource from './backend/wasm/__fixtures__/parity/drawdisplay.zss?raw'
import shortgosource from './backend/wasm/__fixtures__/parity/short_go.zss?raw'
import duplicatorsource from './backend/wasm/__tests__/fixtures/coolregionsbow/duplicator.zss?raw'
import playersource from './backend/wasm/__tests__/fixtures/coolregionsbow/player.zss?raw'
import simplechatplayersource from './backend/wasm/__tests__/fixtures/simple_chat_player.zss?raw'
import benchfixtures from './langcompilebenchfixtures.json'

export type CompileBenchStats = {
  median: number
  p95: number
  min: number
  max: number
}

export type LangCompileBenchRow = {
  id: string
  name: string
  lines: number
  ts: CompileBenchStats
  wasm: CompileBenchStats
  tsbytes: number
  wasmbytes: number
}

export type LangCompileBenchReport = {
  rows: LangCompileBenchRow[]
  moduleloadms: number
  table: string
  iterations: number
  warmup: number
}

export type LangCompileBenchOptions = {
  iterations?: number
  warmup?: number
}

const FIXTURE_SOURCES: Record<string, string> = {
  drawdisplay: drawdisplaysource,
  short_go: shortgosource,
  simple_chat_player: simplechatplayersource,
  duplicator: duplicatorsource,
  player: playersource,
}

export const LANG_COMPILE_BENCH_FIXTURES = benchfixtures as {
  id: string
  compileName: string
  tier: string
}[]

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function p95(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[Math.max(0, index)]
}

function benchstats(fn: () => void, iterations: number, warmup: number) {
  for (let i = 0; i < warmup; i++) {
    fn()
  }
  const samples: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    samples.push(performance.now() - start)
  }
  return {
    median: median(samples),
    p95: p95(samples),
    min: Math.min(...samples),
    max: Math.max(...samples),
  }
}

function formatms(ms: number) {
  return ms < 1 ? `${(ms * 1000).toFixed(0)} µs` : `${ms.toFixed(3)} ms`
}

function formatkb(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formattable(rows: LangCompileBenchRow[], moduleloadms: number) {
  const idwidth = Math.max(...rows.map((row) => row.id.length))
  const lines = [
    'Lang compile benchmark (TS vs Emscripten WASM, same browser session)',
    `WASM module load (one-time): ${formatms(moduleloadms)}`,
    '',
    `${'fixture'.padEnd(idwidth)}  lines   TS median   WASM median   TS p95   WASM p95   speedup`,
    '-'.repeat(idwidth + 72),
  ]
  for (const row of rows) {
    const speedup =
      row.wasm.median > 0 ? (row.ts.median / row.wasm.median).toFixed(1) : '?'
    lines.push(
      `${row.id.padEnd(idwidth)}  ${String(row.lines).padStart(5)}   ${formatms(row.ts.median).padStart(9)}   ${formatms(row.wasm.median).padStart(11)}   ${formatms(row.ts.p95).padStart(6)}   ${formatms(row.wasm.p95).padStart(8)}   ${speedup}x`,
    )
  }
  lines.push('')
  lines.push('Speedup = TS median / WASM median (higher = WASM faster)')
  return lines.join('\n')
}

export async function runlangcompilebench(
  opts: LangCompileBenchOptions = {},
): Promise<LangCompileBenchReport> {
  const iterations = opts.iterations ?? 30
  const warmup = opts.warmup ?? 5

  const loadstart = performance.now()
  const wasmmodule = await createlangmodule()
  const moduleloadms = performance.now() - loadstart

  const rows: LangCompileBenchRow[] = []

  for (const fixture of LANG_COMPILE_BENCH_FIXTURES) {
    const source = FIXTURE_SOURCES[fixture.id]
    if (!source) {
      throw new Error(`missing bench fixture source for ${fixture.id}`)
    }
    const name = fixture.compileName
    const lines = source.split('\n').length

    const tsbuild = compile(name, source)
    const wasmbuild = compilezssonmodule(name, source, wasmmodule)
    if ((tsbuild.errors?.length ?? 0) > 0) {
      throw new Error(
        `ts compile errors for ${fixture.id}: ${tsbuild.errors?.[0]?.message ?? 'unknown'}`,
      )
    }
    if (wasmbuild.errors.length > 0) {
      throw new Error(
        `wasm compile errors for ${fixture.id}: ${wasmbuild.errors[0]?.message ?? 'unknown'}`,
      )
    }

    const ts = benchstats(
      () => {
        compile(name, source)
      },
      iterations,
      warmup,
    )

    const wasm = benchstats(
      () => {
        compilezssonmodule(name, source, wasmmodule)
      },
      iterations,
      warmup,
    )

    rows.push({
      id: fixture.id,
      name,
      lines,
      ts,
      wasm,
      tsbytes: tsbuild.source?.length ?? 0,
      wasmbytes: wasmbuild.wasmbytes.length,
    })
  }

  return {
    rows,
    moduleloadms,
    table: formattable(rows, moduleloadms),
    iterations,
    warmup,
  }
}
