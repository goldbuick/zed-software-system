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
import { buildwanixhellolangs } from 'ops/lib/wanix/buildhellolangs'
import { probewanixtoolchains } from 'ops/lib/wanix/wanixtoolchains'

const WASM_SOURCES = ['hello', 'greet', 'alpha', 'beta', 'termbridge'] as const

type BuildwanixfixturesOptions = {
  strict?: boolean
}

function requirecommand(name: string): string {
  try {
    return execFileSync('which', [name], { encoding: 'utf8' }).trim()
  } catch {
    throw new Error(
      `${name} not found (run yarn task run ops:fixtures:wanix:toolchains)`,
    )
  }
}

function readwasmoutputname(name: (typeof WASM_SOURCES)[number]): string {
  if (name === 'hello') {
    return 'hello-wat.wasm'
  }
  return `${name}.wasm`
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

/** Build drag-drop wanix fixtures from ops/fixtures/wanix/src/*.wat into ops/public/wanix/ */
export function buildwanixfixtures(
  options: BuildwanixfixturesOptions = {},
): void {
  const probes = probewanixtoolchains()
  const wabt = probes.find((row) => row.id === 'wabt')
  if (wabt?.status !== 'ok') {
    throw new Error(
      'wabt required (wat2wasm, wasm-validate) — run yarn task run ops:fixtures:wanix:toolchains',
    )
  }

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
    const output = path.join(
      WANIX_PUBLIC_FIXTURES_DIR,
      readwasmoutputname(name),
    )
    wat2wasm(wat2wasmbin, wasmvalidatebin, input, output)
    wasmout[name] = output
  }

  const stage = mkdtempSync(path.join(tmpdir(), 'wanix-fixtures-'))
  try {
    const single = path.join(stage, 'single')
    const two = path.join(stage, 'two')
    const empty = path.join(stage, 'empty')
    const helloall = path.join(stage, 'helloall')
    mkdirSync(single, { recursive: true })
    mkdirSync(two, { recursive: true })
    mkdirSync(empty, { recursive: true })
    mkdirSync(helloall, { recursive: true })

    cpSync(wasmout.hello, path.join(single, 'hello-wat.wasm'))
    cpSync(wasmout.alpha, path.join(two, 'alpha.wasm'))
    cpSync(wasmout.beta, path.join(two, 'beta.wasm'))
    writeFileSync(
      path.join(empty, 'notes.txt'),
      'no wasm in this bundle\n',
      'utf8',
    )

    maketarball(path.join(WANIX_PUBLIC_FIXTURES_DIR, 'bundle-one.tgz'), single)
    maketarball(path.join(WANIX_PUBLIC_FIXTURES_DIR, 'bundle-two.tgz'), two)
    maketarball(path.join(WANIX_PUBLIC_FIXTURES_DIR, 'bundle-empty.tgz'), empty)
  } finally {
    rmSync(stage, { recursive: true, force: true })
  }

  buildwanixhellolangs({ strict: options.strict, probes })

  process.stdout.write(
    `wanix drag-drop fixtures built in ${WANIX_PUBLIC_FIXTURES_DIR}\n`,
  )
}
