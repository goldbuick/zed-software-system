import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const NATIVEDIR = path.join(__dirname, '../native')
const FIXTUREDIR = path.join(__dirname, '__fixtures__/parity')
const PARITYBIN = path.join(NATIVEDIR, 'zss_lang_parity')
const WADIR = path.join(__dirname, '../../../../../cafe/public/wasm/lang')

export function ensurenativeparitybinary(): void {
  execFileSync(
    'g++',
    [
      '-std=c++14',
      '-O2',
      '-I',
      NATIVEDIR,
      '-DZSS_LANG_PARITY_MAIN',
      '-o',
      PARITYBIN,
      path.join(NATIVEDIR, 'zss_lang_compile.cpp'),
    ],
    { stdio: 'pipe' },
  )
}

export function runnativeparitygate(): string {
  ensurenativeparitybinary()
  return execFileSync(PARITYBIN, [FIXTUREDIR], { encoding: 'utf8' })
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
