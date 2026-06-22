import { execFileSync } from 'node:child_process'
import path from 'node:path'

import {
  ensurenativeparitybinary,
  ensurenativewasmcli,
} from './langparityload'
import { LANG_PARITY_DIR } from 'ops/lib/fixturepaths'

const WASMDIR = path.join(
  __dirname,
  '../../../../zss/feature/lang/backend/wasm',
)
const WCLIBIN = path.join(WASMDIR, 'zss_lang_wasm_cli')
const PARITYBIN = path.join(WASMDIR, 'zss_lang_parity')
const PARITYFIXTUREDIR = LANG_PARITY_DIR

let wasmcliready = false
const wasmcompilecache = new Map<string, Uint8Array>()

/** Build the native wasm CLI once per Jest worker; cache compiles by source text. */
export function compilenativewasmfortest(source: string): Uint8Array {
  if (!wasmcliready) {
    ensurenativewasmcli()
    wasmcliready = true
  }
  const cached = wasmcompilecache.get(source)
  if (cached) {
    return cached
  }
  const buf = execFileSync(WCLIBIN, [], {
    input: source,
    maxBuffer: 10 * 1024 * 1024,
  })
  const bytes = new Uint8Array(buf)
  wasmcompilecache.set(source, bytes)
  return bytes
}

let paritybinready = false

/** Build the parity gate binary once per Jest worker. */
export function runnativeparitygatefortest(): string {
  if (!paritybinready) {
    ensurenativeparitybinary()
    paritybinready = true
  }
  return execFileSync(PARITYBIN, [PARITYFIXTUREDIR], { encoding: 'utf8' })
}
