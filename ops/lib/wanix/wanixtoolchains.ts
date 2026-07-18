import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { WANIX_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import {
  WANIX_GOJS_BRIDGE_MARKER,
  WANIX_SUBMODULE_DIR,
  WANIX_ZEDCAFE_DIRTY_FORWARD_PATCH,
  haswanixzedcafedirtyforward,
} from 'ops/lib/wanix/wanixsubmodule'

export type WanixProbeStatus = 'ok' | 'missing' | 'partial'

export type WanixProbeResult = {
  id: string
  label: string
  covers: string[]
  required: boolean
  status: WanixProbeStatus
  detail: string
  version: string
  installdarwin: string[]
  installlinux: string[]
  nextsteps: string[]
}

export type WanixToolchainDeps = {
  which: (name: string) => string | undefined
  exec: (cmd: string, args: string[]) => string | undefined
  exists: (path: string) => boolean
  platform: NodeJS.Platform
}

const WANIX_ZEDCAFE_DIRTY_APPLY =
  'git -C submodules/wanix apply ../../ops/patches/wanix-worker-zedcafeexportdirty.patch'

function defaultwhich(name: string): string | undefined {
  try {
    return execFileSync('which', [name], { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

function defaultexec(cmd: string, args: string[]): string | undefined {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

function defaultdeps(): WanixToolchainDeps {
  return {
    which: defaultwhich,
    exec: defaultexec,
    exists: existsSync,
    platform: process.platform,
  }
}

function readversion(
  deps: WanixToolchainDeps,
  cmd: string,
  args: string[],
): string {
  const out = deps.exec(cmd, args)
  if (!out) {
    return ''
  }
  return out.split('\n')[0] ?? ''
}

function hasrustwasip1target(deps: WanixToolchainDeps): boolean {
  const rustup = deps.which('rustup')
  if (rustup) {
    const installed = deps.exec(rustup, ['target', 'list', '--installed']) ?? ''
    return installed.includes('wasm32-wasip1')
  }
  return false
}

function readwasip1clangargs(deps: WanixToolchainDeps): string[] | undefined {
  if (readwasip1clangbin(deps)) {
    return ['--target=wasm32-wasip1']
  }
  return undefined
}

function readwasip1clangbin(deps: WanixToolchainDeps): string | undefined {
  const wasisdkpaths = [process.env.WASI_SDK_PATH, '/opt/wasi-sdk'].filter(
    (value): value is string => Boolean(value),
  )

  for (const wasisdk of wasisdkpaths) {
    const clang = path.join(wasisdk, 'bin', 'clang')
    if (deps.exists(clang)) {
      return clang
    }
  }

  const clang = deps.which('clang')
  if (!clang) {
    return undefined
  }
  const brewsysroot = '/opt/homebrew/share/wasi-sysroot'
  if (deps.exists(brewsysroot)) {
    return clang
  }
  const localsysroot = '/usr/share/wasi-sysroot'
  if (deps.exists(localsysroot)) {
    return clang
  }
  return undefined
}

function probewabt(deps: WanixToolchainDeps): WanixProbeResult {
  const wat2wasm = deps.which('wat2wasm')
  const wasmvalidate = deps.which('wasm-validate')
  const version = wat2wasm ? readversion(deps, 'wat2wasm', ['--version']) : ''
  let status: WanixProbeStatus = 'ok'
  let detail = 'wat2wasm and wasm-validate on PATH'
  const nextsteps: string[] = []
  if (!wat2wasm || !wasmvalidate) {
    status = 'missing'
    detail = 'wat2wasm and wasm-validate required for WAT fixtures'
  }
  return {
    id: 'wabt',
    label: 'wabt',
    covers: ['wat', 'greet', 'alpha', 'beta', 'termbridge'],
    required: true,
    status,
    detail,
    version,
    installdarwin: ['brew install wabt'],
    installlinux: ['sudo apt install wabt'],
    nextsteps,
  }
}

function probego(deps: WanixToolchainDeps): WanixProbeResult {
  const gobin = deps.which('go')
  const gomod = path.join(WANIX_FIXTURES_DIR, 'go.mod')
  const submod = path.join(WANIX_SUBMODULE_DIR, 'go.mod')
  const version = gobin ? readversion(deps, 'go', ['version']) : ''
  let status: WanixProbeStatus = 'ok'
  let detail = 'go on PATH'
  const nextsteps: string[] = []
  if (!gobin) {
    status = 'missing'
    detail = 'go required for Go WASI, Go gojs, zedcafe, findplayers'
  } else if (!deps.exists(gomod)) {
    status = 'partial'
    detail = `missing ${gomod}`
  } else if (!deps.exists(submod)) {
    status = 'partial'
    detail = 'submodules/wanix not initialized'
    nextsteps.push('git submodule update --init submodules/wanix')
  } else if (!haswanixzedcafedirtyforward()) {
    status = 'partial'
    detail = `submodules/wanix missing ${WANIX_GOJS_BRIDGE_MARKER}`
    if (deps.exists(WANIX_ZEDCAFE_DIRTY_FORWARD_PATCH)) {
      nextsteps.push(WANIX_ZEDCAFE_DIRTY_APPLY)
      nextsteps.push(
        'commit in submodules/wanix, rebuild cafe/public/wanix/wanix.wasm, bump parent gitlink, push the submodule commit to a durable remote',
      )
    } else {
      nextsteps.push(
        `restore ${path.relative(process.cwd(), WANIX_ZEDCAFE_DIRTY_FORWARD_PATCH)} from git`,
      )
    }
  }
  return {
    id: 'go',
    label: 'go',
    covers: ['gowasi', 'gojs', 'zedcafe', 'findplayers'],
    required: true,
    status,
    detail,
    version,
    installdarwin: ['brew install go'],
    installlinux: ['sudo apt install golang-go'],
    nextsteps,
  }
}

function proberust(deps: WanixToolchainDeps): WanixProbeResult {
  const rustbin = deps.which('rustc')
  const version = rustbin ? readversion(deps, 'rustc', ['--version']) : ''
  let status: WanixProbeStatus = 'ok'
  let detail = 'rustc with wasm32-wasip1 target'
  const nextsteps: string[] = []
  if (!rustbin) {
    status = 'missing'
    detail = 'rustc not on PATH'
  } else if (!hasrustwasip1target(deps)) {
    status = 'partial'
    detail = 'wasm32-wasip1 target not installed'
    nextsteps.push('rustup target add wasm32-wasip1')
  }
  return {
    id: 'rust',
    label: 'rust',
    covers: ['hello-rust'],
    required: false,
    status,
    detail,
    version,
    installdarwin: ['brew install rust', 'rustup target add wasm32-wasip1'],
    installlinux: [
      'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh',
      'rustup target add wasm32-wasip1',
    ],
    nextsteps,
  }
}

function probezig(deps: WanixToolchainDeps): WanixProbeResult {
  const zigbin = deps.which('zig')
  const version = zigbin ? readversion(deps, 'zig', ['version']) : ''
  const status: WanixProbeStatus = zigbin ? 'ok' : 'missing'
  return {
    id: 'zig',
    label: 'zig',
    covers: ['hello-zig'],
    required: false,
    status,
    detail: zigbin ? 'zig on PATH' : 'zig not on PATH',
    version,
    installdarwin: ['brew install zig'],
    installlinux: ['sudo apt install zig'],
    nextsteps: [],
  }
}

function probetinygo(deps: WanixToolchainDeps): WanixProbeResult {
  const tinygobin = deps.which('tinygo')
  const version = tinygobin ? readversion(deps, 'tinygo', ['version']) : ''
  const status: WanixProbeStatus = tinygobin ? 'ok' : 'missing'
  return {
    id: 'tinygo',
    label: 'tinygo',
    covers: ['hello-tinygo'],
    required: false,
    status,
    detail: tinygobin ? 'tinygo on PATH' : 'tinygo not on PATH',
    version,
    installdarwin: [
      'brew tap tinygo-org/tools && brew trust tinygo-org/tools && brew install tinygo',
    ],
    installlinux: [
      'wget https://github.com/tinygo-org/tinygo/releases/download/v0.34.0/tinygo_0.34.0_amd64.deb',
      'sudo dpkg -i tinygo_0.34.0_amd64.deb',
    ],
    nextsteps: [],
  }
}

function probeclang(deps: WanixToolchainDeps): WanixProbeResult {
  const clangbin = readwasip1clangbin(deps)
  const version = clangbin ? readversion(deps, clangbin, ['--version']) : ''
  const clangargs = readwasip1clangargs(deps)
  let status: WanixProbeStatus = 'ok'
  let detail = 'wasi-sdk or clang with wasi-sysroot'
  const nextsteps: string[] = []
  if (!clangbin || !clangargs) {
    status = 'missing'
    detail = 'wasi-sdk clang not found (set WASI_SDK_PATH or install wasi-sdk)'
    nextsteps.push(
      'brew install wasi-libc',
      'export WASI_SDK_PATH=/opt/wasi-sdk',
    )
  }
  return {
    id: 'clang',
    label: 'clang / wasi-sdk',
    covers: ['hello-c'],
    required: false,
    status,
    detail,
    version,
    installdarwin: [
      'install wasi-sdk to /opt/wasi-sdk or set WASI_SDK_PATH',
      'https://github.com/WebAssembly/wasi-sdk/releases',
    ],
    installlinux: [
      'sudo apt install clang',
      'download wasi-sdk from https://github.com/WebAssembly/wasi-sdk/releases',
    ],
    nextsteps,
  }
}

function probedocker(deps: WanixToolchainDeps): WanixProbeResult {
  const dockerbin = deps.which('docker')
  const version = dockerbin ? readversion(deps, 'docker', ['--version']) : ''
  const status: WanixProbeStatus = dockerbin ? 'ok' : 'missing'
  return {
    id: 'docker',
    label: 'docker',
    covers: ['zedcafe-linux-overlay'],
    required: false,
    status,
    detail: dockerbin
      ? 'docker on PATH (linux overlay build)'
      : 'docker not on PATH (linux overlay build)',
    version,
    installdarwin: ['brew install --cask docker'],
    installlinux: ['sudo apt install docker.io'],
    nextsteps: [],
  }
}

/** Probe all wanix fixture build toolchains. */
export function probewanixtoolchains(
  partial?: Partial<WanixToolchainDeps>,
): WanixProbeResult[] {
  const deps = { ...defaultdeps(), ...partial }
  return [
    probewabt(deps),
    probego(deps),
    proberust(deps),
    probezig(deps),
    probetinygo(deps),
    probeclang(deps),
    probedocker(deps),
  ]
}

export function readwanixprobebyid(
  results: WanixProbeResult[],
  id: string,
): WanixProbeResult | undefined {
  return results.find((row) => row.id === id)
}

export function readhellolangready(
  results: WanixProbeResult[],
  toolchain: string,
): { ready: boolean; reason: string } {
  const probe = readwanixprobebyid(results, toolchain)
  if (!probe) {
    return { ready: false, reason: `unknown toolchain ${toolchain}` }
  }
  if (probe.status === 'ok') {
    return { ready: true, reason: probe.detail }
  }
  return { ready: false, reason: probe.detail }
}

function readinstallhints(
  probe: WanixProbeResult,
  platform: NodeJS.Platform,
): string[] {
  if (platform === 'darwin') {
    return probe.installdarwin
  }
  if (platform === 'linux') {
    return probe.installlinux
  }
  return [...probe.installdarwin, ...probe.installlinux]
}

/** Print toolchain report; return process exit code (0 = required probes ok). */
export function printwanixtoolchainsreport(
  results: WanixProbeResult[],
  platform: NodeJS.Platform = process.platform,
): number {
  process.stdout.write('Wanix fixture toolchains\n')
  process.stdout.write('========================\n\n')
  let requiredfailed = false
  for (const probe of results) {
    const tag = probe.required ? 'required' : 'optional'
    const version = probe.version ? ` (${probe.version})` : ''
    process.stdout.write(
      `[${tag}] ${probe.label.padEnd(18)} ${probe.status}${version}\n`,
    )
    process.stdout.write(`        covers: ${probe.covers.join(', ')}\n`)
    process.stdout.write(`        ${probe.detail}\n`)
    if (probe.status !== 'ok') {
      const hints = readinstallhints(probe, platform)
      for (const hint of hints) {
        process.stdout.write(`        install: ${hint}\n`)
      }
      for (const step of probe.nextsteps) {
        process.stdout.write(`        next: ${step}\n`)
      }
    }
    process.stdout.write('\n')
    if (probe.required && probe.status !== 'ok') {
      requiredfailed = true
    }
  }
  if (requiredfailed) {
    process.stdout.write(
      'Required toolchains missing — install deps above, then re-run.\n',
    )
    return 1
  }
  process.stdout.write('Required toolchains ok.\n')
  return 0
}

/** Return wasi-sdk/clang binary for wasip1 compile, or undefined if unavailable. */
export function readwasip1clangcompilebin(
  partial?: Partial<WanixToolchainDeps>,
): string | undefined {
  const deps = { ...defaultdeps(), ...partial }
  return readwasip1clangbin(deps)
}

/** Return clang args for wasip1 compile, or undefined if unavailable. */
export function readwasip1clangcompileargs(
  partial?: Partial<WanixToolchainDeps>,
): string[] | undefined {
  const deps = { ...defaultdeps(), ...partial }
  return readwasip1clangargs(deps)
}
