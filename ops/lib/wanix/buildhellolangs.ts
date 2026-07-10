import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  WANIX_FIXTURES_DIR,
  WANIX_PUBLIC_FIXTURES_DIR,
} from 'ops/lib/fixturepaths'
import {
  type WanixProbeResult,
  probewanixtoolchains,
  readhellolangready,
  readwasip1clangcompileargs,
  readwasip1clangcompilebin,
} from 'ops/lib/wanix/wanixtoolchains'

const HELLO_DIR = path.join(WANIX_FIXTURES_DIR, 'hello')
const TOOLCHAINS_HINT = 'yarn task run ops:fixtures:wanix:toolchains'

const GO_WASI_ENV = { ...process.env, GOOS: 'wasip1', GOARCH: 'wasm' }
const GO_JS_ENV = { ...process.env, GOOS: 'js', GOARCH: 'wasm' }

type BuildhellolangsOptions = {
  strict?: boolean
  probes?: WanixProbeResult[]
}

function validatewasm(
  wasmvalidatebin: string | undefined,
  output: string,
): void {
  if (!wasmvalidatebin) {
    return
  }
  execFileSync(wasmvalidatebin, [output], { stdio: 'inherit' })
}

function skiporfail(
  lang: string,
  reason: string,
  strict: boolean,
): 'skip' | 'fail' {
  if (strict) {
    throw new Error(`${lang}: ${reason}`)
  }
  process.stdout.write(`skipped ${lang}: ${reason} (run ${TOOLCHAINS_HINT})\n`)
  return 'skip'
}

function runhellobuild(lang: string, strict: boolean, fn: () => void): void {
  try {
    fn()
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'build failed'
    if (skiporfail(lang, reason, strict) === 'fail') {
      throw err
    }
  }
}

function buildrust(
  output: string,
  probes: WanixProbeResult[],
  wasmvalidatebin: string | undefined,
  strict: boolean,
): void {
  const ready = readhellolangready(probes, 'rust')
  if (!ready.ready) {
    skiporfail('rust', ready.reason, strict)
    return
  }
  const input = path.join(HELLO_DIR, 'rust', 'main.rs')
  process.stdout.write(`rustc hello-rust -> ${path.basename(output)}\n`)
  execFileSync('rustc', ['--target', 'wasm32-wasip1', '-o', output, input], {
    stdio: 'inherit',
  })
  validatewasm(wasmvalidatebin, output)
}

function buildzig(
  output: string,
  probes: WanixProbeResult[],
  wasmvalidatebin: string | undefined,
  strict: boolean,
): void {
  const ready = readhellolangready(probes, 'zig')
  if (!ready.ready) {
    skiporfail('zig', ready.reason, strict)
    return
  }
  const input = path.join(HELLO_DIR, 'zig', 'main.zig')
  process.stdout.write(`zig hello-zig -> ${path.basename(output)}\n`)
  execFileSync(
    'zig',
    [
      'build-exe',
      input,
      '-femit-bin=' + output,
      '-target',
      'wasm32-wasi',
      '-O',
      'ReleaseSmall',
      '--stack',
      '65536',
    ],
    { stdio: 'inherit' },
  )
  validatewasm(wasmvalidatebin, output)
}

function buildgowasi(
  output: string,
  probes: WanixProbeResult[],
  wasmvalidatebin: string | undefined,
  strict: boolean,
): void {
  const ready = readhellolangready(probes, 'go')
  if (!ready.ready) {
    skiporfail('gowasi', ready.reason, strict)
    return
  }
  const pkg = './hello/gowasi'
  process.stdout.write(`go wasip1 hello-gowasi -> ${path.basename(output)}\n`)
  execFileSync('go', ['build', '-o', output, pkg], {
    cwd: WANIX_FIXTURES_DIR,
    stdio: 'inherit',
    env: GO_WASI_ENV,
  })
  validatewasm(wasmvalidatebin, output)
}

function buildtinygo(
  output: string,
  probes: WanixProbeResult[],
  wasmvalidatebin: string | undefined,
  strict: boolean,
): void {
  const ready = readhellolangready(probes, 'tinygo')
  if (!ready.ready) {
    skiporfail('tinygo', ready.reason, strict)
    return
  }
  const pkg = path.join(HELLO_DIR, 'tinygo')
  process.stdout.write(`tinygo hello-tinygo -> ${path.basename(output)}\n`)
  execFileSync('tinygo', ['build', '-target', 'wasi', '-o', output, '.'], {
    cwd: pkg,
    stdio: 'inherit',
  })
  validatewasm(wasmvalidatebin, output)
}

function buildc(
  output: string,
  probes: WanixProbeResult[],
  wasmvalidatebin: string | undefined,
  strict: boolean,
): void {
  const ready = readhellolangready(probes, 'clang')
  if (!ready.ready) {
    skiporfail('c', ready.reason, strict)
    return
  }
  const clangargs = readwasip1clangcompileargs()
  const clangbin = readwasip1clangcompilebin()
  if (!clangargs || !clangbin) {
    skiporfail('c', 'wasi-sdk clang not found', strict)
    return
  }
  const input = path.join(HELLO_DIR, 'c', 'main.c')
  process.stdout.write(`clang hello-c -> ${path.basename(output)}\n`)
  execFileSync(clangbin, [...clangargs, '-o', output, input], {
    stdio: 'inherit',
  })
  validatewasm(wasmvalidatebin, output)
}

function buildgojs(
  output: string,
  probes: WanixProbeResult[],
  strict: boolean,
): void {
  const ready = readhellolangready(probes, 'go')
  if (!ready.ready) {
    skiporfail('gojs', ready.reason, strict)
    return
  }
  const pkg = './hello/gojs'
  process.stdout.write(`go js/wasm hello-gojs -> ${path.basename(output)}\n`)
  execFileSync('go', ['build', '-o', output, pkg], {
    cwd: WANIX_FIXTURES_DIR,
    stdio: 'inherit',
    env: GO_JS_ENV,
  })
}

function makehelloalltarball(): void {
  const names = [
    'hello-wat.wasm',
    'hello-rust.wasm',
    'hello-zig.wasm',
    'hello-gowasi.wasm',
    'hello-tinygo.wasm',
    'hello-c.wasm',
    'hello-gojs.wasm',
  ]
  const present = names.filter((name) =>
    existsSync(path.join(WANIX_PUBLIC_FIXTURES_DIR, name)),
  )
  if (present.length < 2) {
    return
  }
  const stage = mkdtempSync(path.join(tmpdir(), 'wanix-hello-all-'))
  try {
    for (const name of present) {
      cpSync(path.join(WANIX_PUBLIC_FIXTURES_DIR, name), path.join(stage, name))
    }
    const output = path.join(WANIX_PUBLIC_FIXTURES_DIR, 'hello-all.tgz')
    execFileSync('tar', ['-czf', output, '-C', stage, '.'], {
      stdio: 'inherit',
    })
    process.stdout.write(`hello-all.tgz (${present.length} wasm files)\n`)
  } finally {
    rmSync(stage, { recursive: true, force: true })
  }
}

/** Build per-language hello wasm fixtures into ops/public/wanix/. */
export function buildwanixhellolangs(
  options: BuildhellolangsOptions = {},
): void {
  const strict = options.strict ?? false
  const probes = options.probes ?? probewanixtoolchains()
  const wasmvalidatebin = probes.find((row) => row.id === 'wabt')
    ? (() => {
        try {
          return execFileSync('which', ['wasm-validate'], {
            encoding: 'utf8',
          }).trim()
        } catch {
          return undefined
        }
      })()
    : undefined

  mkdirSync(WANIX_PUBLIC_FIXTURES_DIR, { recursive: true })

  const out = (name: string) => path.join(WANIX_PUBLIC_FIXTURES_DIR, name)

  runhellobuild('rust', strict, () =>
    buildrust(out('hello-rust.wasm'), probes, wasmvalidatebin, strict),
  )
  runhellobuild('zig', strict, () =>
    buildzig(out('hello-zig.wasm'), probes, wasmvalidatebin, strict),
  )
  runhellobuild('gowasi', strict, () =>
    buildgowasi(out('hello-gowasi.wasm'), probes, wasmvalidatebin, strict),
  )
  runhellobuild('tinygo', strict, () =>
    buildtinygo(out('hello-tinygo.wasm'), probes, wasmvalidatebin, strict),
  )
  runhellobuild('c', strict, () =>
    buildc(out('hello-c.wasm'), probes, wasmvalidatebin, strict),
  )
  runhellobuild('gojs', strict, () =>
    buildgojs(out('hello-gojs.wasm'), probes, strict),
  )
  makehelloalltarball()
}
