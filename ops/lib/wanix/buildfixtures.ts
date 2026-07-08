import { execFileSync, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  WANIX_FIXTURES_DIR,
  WANIX_PUBLIC_FIXTURES_DIR,
} from 'ops/lib/fixturepaths'

const WASM_SOURCES = ['hello', 'greet', 'alpha', 'beta', 'termbridge'] as const

function requirecommand(name: string): string {
  try {
    return execFileSync('which', [name], { encoding: 'utf8' }).trim()
  } catch {
    throw new Error(`${name} not found (install wabt: brew install wabt)`)
  }
}

function wat2wasm(
  wat2wasmbin: string,
  wasmvalidatebin: string,
  input: string,
  output: string,
): void {
  execFileSync(wat2wasmbin, [input, '-o', output], { stdio: 'inherit' })
  execFileSync(wasmvalidatebin, [output], { stdio: 'inherit' })
}

function maketarball(output: string, cwd: string): void {
  const result = spawnSync('tar', ['-czf', output, '-C', cwd, '.'], {
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    throw new Error(`tar failed for ${output}`)
  }
}

/** Build drag-drop wanix fixtures from ops/fixtures/wanix/src/*.wat */
export function buildwanixfixtures(): void {
  const wat2wasmbin = requirecommand('wat2wasm')
  const wasmvalidatebin = requirecommand('wasm-validate')
  const srcdir = path.join(WANIX_FIXTURES_DIR, 'src')

  if (!existsSync(srcdir)) {
    throw new Error(`wanix fixture sources missing: ${srcdir}`)
  }

  mkdirSync(WANIX_PUBLIC_FIXTURES_DIR, { recursive: true })

  const wasmout: Record<string, string> = {}
  for (const name of WASM_SOURCES) {
    const input = path.join(srcdir, `${name}.wat`)
    const output = path.join(WANIX_FIXTURES_DIR, `${name}.wasm`)
    wat2wasm(wat2wasmbin, wasmvalidatebin, input, output)
    wasmout[name] = output
  }

  const stage = mkdtempSync(path.join(tmpdir(), 'wanix-fixtures-'))
  try {
    const single = path.join(stage, 'single')
    const two = path.join(stage, 'two')
    const empty = path.join(stage, 'empty')
    mkdirSync(single, { recursive: true })
    mkdirSync(two, { recursive: true })
    mkdirSync(empty, { recursive: true })

    cpSync(wasmout.hello, path.join(single, 'hello.wasm'))
    cpSync(wasmout.alpha, path.join(two, 'alpha.wasm'))
    cpSync(wasmout.beta, path.join(two, 'beta.wasm'))
    writeFileSync(
      path.join(empty, 'notes.txt'),
      'no wasm in this bundle\n',
      'utf8',
    )

    maketarball(path.join(WANIX_FIXTURES_DIR, 'bundle-one.tgz'), single)
    maketarball(path.join(WANIX_FIXTURES_DIR, 'bundle-two.tgz'), two)
    maketarball(path.join(WANIX_FIXTURES_DIR, 'bundle-empty.tgz'), empty)
  } finally {
    rmSync(stage, { recursive: true, force: true })
  }

  for (const name of WASM_SOURCES) {
    cpSync(wasmout[name], path.join(WANIX_PUBLIC_FIXTURES_DIR, `${name}.wasm`))
  }
  for (const bundle of ['bundle-one', 'bundle-two', 'bundle-empty'] as const) {
    cpSync(
      path.join(WANIX_FIXTURES_DIR, `${bundle}.tgz`),
      path.join(WANIX_PUBLIC_FIXTURES_DIR, `${bundle}.tgz`),
    )
  }

  process.stdout.write(
    `wanix fixtures built in ${WANIX_FIXTURES_DIR} and ${WANIX_PUBLIC_FIXTURES_DIR}\n`,
  )
}
