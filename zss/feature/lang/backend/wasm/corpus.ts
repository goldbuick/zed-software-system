import { readFileSync } from 'node:fs'
import path from 'node:path'

export { COOLREGIONSBOW_BOOK_JSON_PATH } from 'zss/testsupport/coolregionsbowbook'

const WASMDIR = __dirname

export type CorpusTier = 'parity' | 'integration' | 'book'

const MANIFEST_PATHS: Record<CorpusTier, string> = {
  parity: path.join(WASMDIR, '__fixtures__/parity/manifest.json'),
  integration: path.join(WASMDIR, '__fixtures__/integration/manifest.json'),
  book: path.join(WASMDIR, '__tests__/fixtures/coolregionsbow/manifest.json'),
}

const SOURCE_DIRS: Record<CorpusTier, string> = {
  parity: path.join(WASMDIR, '__fixtures__/parity'),
  integration: path.join(WASMDIR, '__tests__/fixtures'),
  book: path.join(WASMDIR, '__tests__/fixtures/coolregionsbow'),
}

/** Micro-fixtures with TS golden outputs — lexer/parser/codegen edge cases. */
export function parityids(): string[] {
  return readmanifest('parity')
}

/** Real scripts from shipped boards (Simple Chat sidebar, elseif chains, …). */
export function integrationids(): string[] {
  return readmanifest('integration')
}

/** Full coolregionsbow element scripts (53 chips). */
export function bookids(): string[] {
  return readmanifest('book')
}

export function allcorpusids(): { tier: CorpusTier; id: string }[] {
  const out: { tier: CorpusTier; id: string }[] = []
  for (const tier of ['parity', 'integration', 'book'] as const) {
    for (const id of readmanifest(tier)) {
      out.push({ tier, id })
    }
  }
  return out
}

export function readmanifest(tier: CorpusTier): string[] {
  return JSON.parse(readFileSync(MANIFEST_PATHS[tier], 'utf8')) as string[]
}

export function readcorpus(tier: CorpusTier, id: string): string {
  return readFileSync(path.join(SOURCE_DIRS[tier], `${id}.zss`), 'utf8')
}

export function iswasmmagic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x73 &&
    bytes[3] === 0x6d
  )
}
