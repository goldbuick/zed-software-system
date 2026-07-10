import { execFileSync, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
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

/** 8×8 solid PNGs with distinct tEXt padding → pairwise-different byte lengths. */
const STAMP_PNG_BY_NAME: Record<string, Buffer> = {
  'stamp-red.png': Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAACXRFWHRDb21tZW50AHI3IZ0WAAAAEUlEQVR42mO4o6GBFTEMLQkAe3tLAYZNzu4AAAAASUVORK5CYII=',
    'base64',
  ),
  'stamp-green.png': Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAACnRFWHRDb21tZW50AGdnwoJprgAAABFJREFUeNpj0NhigxUxDC0JAFVdRgHSIbPlAAAAAElFTkSuQmCC',
    'base64',
  ),
  'stamp-blue.png': Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAADHRFWHRDb21tZW50AGJiYmKAUaNuAAAAEUlEQVR42mPQCLiDFTEMLQkACbdVAYkL2PAAAAAASUVORK5CYII=',
    'base64',
  ),
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

function buildgowasiwasm(maindir: string, output: string, label: string): void {
  if (!existsSync(path.join(maindir, 'main.go'))) {
    throw new Error(`${label} source missing: ${maindir}`)
  }
  const result = spawnSync('go', ['build', '-o', output, '.'], {
    cwd: maindir,
    stdio: 'inherit',
    env: {
      ...process.env,
      GOOS: 'wasip1',
      GOARCH: 'wasm',
    },
  })
  if (result.status !== 0) {
    throw new Error(`go build ${label} failed`)
  }
}

function writestamppngs(outdir: string): void {
  const names = Object.keys(STAMP_PNG_BY_NAME)
  for (let i = 0; i < names.length; ++i) {
    const name = names[i]
    writeFileSync(path.join(outdir, name), STAMP_PNG_BY_NAME[name])
  }
  const legacy = path.join(outdir, 'stamp.png')
  if (existsSync(legacy)) {
    unlinkSync(legacy)
  }
  const lengths = names.map((name) => STAMP_PNG_BY_NAME[name].length)
  if (
    lengths[0] === lengths[1] ||
    lengths[0] === lengths[2] ||
    lengths[1] === lengths[2]
  ) {
    throw new Error(
      `stamp png byte lengths must be pairwise distinct (got ${lengths.join(',')})`,
    )
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
  buildgowasiwasm(
    path.join(WANIX_FIXTURES_DIR, 'input2terrain'),
    path.join(WANIX_PUBLIC_FIXTURES_DIR, 'input2terrain.wasm'),
    'input2terrain.wasm',
  )
  buildgowasiwasm(
    path.join(WANIX_FIXTURES_DIR, 'listinput'),
    path.join(WANIX_PUBLIC_FIXTURES_DIR, 'listinput.wasm'),
    'listinput.wasm',
  )
  cpSync(
    path.join(srcdir, 'png2terrain.sh'),
    path.join(WANIX_PUBLIC_FIXTURES_DIR, 'png2terrain.sh'),
  )
  writestamppngs(WANIX_PUBLIC_FIXTURES_DIR)

  process.stdout.write(
    `wanix drag-drop fixtures built in ${WANIX_PUBLIC_FIXTURES_DIR}\n`,
  )
}
