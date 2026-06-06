import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const COMPILERDIR = __dirname
const REPROOT = path.join(__dirname, '../../../../../')
const COMPILEONE = path.join(REPROOT, 'scripts/lang-wasm-compile-one.mjs')
const FIXTUREDIR = path.join(__dirname, '__fixtures__/parity')
const PARITYBIN = path.join(COMPILERDIR, 'zss_lang_parity')
const WCLIBIN = path.join(COMPILERDIR, 'zss_lang_wasm_cli')
const WADIR = path.join(__dirname, '../../../../../cafe/public/wasm/lang')

const COMPILESRC = path.join(COMPILERDIR, 'zss_lang_compile.cpp')

function buildnative(define: string, out: string) {
  execFileSync(
    'g++',
    ['-std=c++14', '-O2', '-I', COMPILERDIR, define, '-o', out, COMPILESRC],
    { stdio: 'pipe' },
  )
}

export function ensurenativeparitybinary(): void {
  buildnative('-DZSS_LANG_PARITY_MAIN', PARITYBIN)
}

export function ensurenativewasmcli(): void {
  buildnative('-DZSS_LANG_WASM_CLI', WCLIBIN)
}

export function runnativeparitygate(): string {
  ensurenativeparitybinary()
  return execFileSync(PARITYBIN, [FIXTUREDIR], { encoding: 'utf8' })
}

export function compilenativewasm(source: string): Uint8Array {
  ensurenativewasmcli()
  const buf = execFileSync(WCLIBIN, [], {
    input: source,
    maxBuffer: 10 * 1024 * 1024,
  })
  return new Uint8Array(buf)
}

export type CppCompileResult = {
  errors: {
    offset: number
    line: number
    column: number
    length: number
    message: string
  }[]
  labelsjson: string
  debugmap: string
  importmanifest: string
  wasmbytes: Uint8Array
}

export function compilecppfromdisk(
  name: string,
  source: string,
): CppCompileResult {
  const buf = spawnSync('node', [COMPILEONE, name], {
    input: source,
    maxBuffer: 20 * 1024 * 1024,
    cwd: REPROOT,
  })
  if (buf.status !== 0) {
    throw new Error(
      `lang-wasm-compile-one failed: ${buf.stderr?.toString() ?? buf.status}`,
    )
  }
  const parsed = JSON.parse(buf.stdout.toString('utf8')) as {
    errors: CppCompileResult['errors']
    labelsjson: string
    debugmap: string
    importmanifest: string
    wasmbytes: number[]
  }
  return {
    errors: parsed.errors,
    labelsjson: parsed.labelsjson,
    debugmap: parsed.debugmap,
    importmanifest: parsed.importmanifest,
    wasmbytes: new Uint8Array(parsed.wasmbytes),
  }
}

export function readfixture(id: string, ext: string): string {
  return readFileSync(path.join(FIXTUREDIR, `${id}.${ext}`), 'utf8')
}

export function wasmartifactspresent(): boolean {
  try {
    readFileSync(path.join(WADIR, 'zss_lang.wasm'))
    readFileSync(path.join(WADIR, 'zss_lang.js'))
    return true
  } catch {
    return false
  }
}
