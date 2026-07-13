import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

import { CAFE_PUBLIC_ZEDSYNC_WASM } from 'ops/lib/cafepublicpaths'
import {
  WANIX_FIXTURES_DIR,
  WANIX_PUBLIC_FIXTURES_DIR,
} from 'ops/lib/fixturepaths'

const WANIX_SUBMODULE_DIR = path.join(process.cwd(), 'submodules', 'wanix')
const FINDPLAYERS_PACKAGE = path.join(
  WANIX_FIXTURES_DIR,
  'findplayers',
  'cmd',
  'main.go',
)
const GREENRING_PACKAGE = path.join(
  WANIX_FIXTURES_DIR,
  'greenring',
  'cmd',
  'main.go',
)
const ZEDSYNC_PACKAGE = path.join(
  WANIX_FIXTURES_DIR,
  'zedsync',
  'cmd',
  'main.go',
)
const FINDPLAYERS_STAGING_WASM = path.join(
  WANIX_PUBLIC_FIXTURES_DIR,
  'findplayers.wasm',
)
const GREENRING_STAGING_WASM = path.join(
  WANIX_PUBLIC_FIXTURES_DIR,
  'greenring.wasm',
)
const ZEDSYNC_STAGING_WASM = path.join(
  WANIX_PUBLIC_FIXTURES_DIR,
  'zedsync.wasm',
)
const ZEDSYNC_PUBLIC_WASM = CAFE_PUBLIC_ZEDSYNC_WASM

const GOJS_ENV = { ...process.env, GOOS: 'js', GOARCH: 'wasm' }

function requirego(): void {
  try {
    execFileSync('go', ['version'], { stdio: 'ignore' })
  } catch {
    throw new Error(
      'go not found — install Go (brew install go) to build wanix wasm binaries',
    )
  }
}

function requirewanixsubmodule(): void {
  const wanixgomod = path.join(WANIX_SUBMODULE_DIR, 'go.mod')
  if (!existsSync(wanixgomod)) {
    throw new Error(
      `missing ${wanixgomod} — run: git submodule update --init submodules/wanix`,
    )
  }
}

function requiregomod(): void {
  const gomod = path.join(WANIX_FIXTURES_DIR, 'go.mod')
  if (!existsSync(gomod)) {
    throw new Error(`missing ${gomod}`)
  }
}

function buildgojswasm(label: string, packagepath: string, outwasm: string) {
  if (!existsSync(packagepath)) {
    throw new Error(`missing ${packagepath}`)
  }
  process.stdout.write(`go build ${label} -> ${path.basename(outwasm)}\n`)
  const pkgdir = path.dirname(packagepath)
  const rel = path.relative(WANIX_FIXTURES_DIR, pkgdir)
  execFileSync('go', ['build', '-o', outwasm, `./${rel}`], {
    cwd: WANIX_FIXTURES_DIR,
    stdio: 'inherit',
    env: GOJS_ENV,
  })
}

/**
 * Build findplayers + greenring (fixture only) and zedsync (shipped to cafe/public).
 */
export function buildwanixfindplayers(): void {
  requirego()
  requiregomod()
  requirewanixsubmodule()

  mkdirSync(WANIX_PUBLIC_FIXTURES_DIR, { recursive: true })
  mkdirSync(path.dirname(ZEDSYNC_PUBLIC_WASM), { recursive: true })

  buildgojswasm('findplayers', FINDPLAYERS_PACKAGE, FINDPLAYERS_STAGING_WASM)
  process.stdout.write(
    `findplayers.wasm written to ${FINDPLAYERS_STAGING_WASM} (fixture only — not copied to cafe/public)\n`,
  )

  buildgojswasm('greenring', GREENRING_PACKAGE, GREENRING_STAGING_WASM)
  process.stdout.write(
    `greenring.wasm written to ${GREENRING_STAGING_WASM} (fixture only — not copied to cafe/public)\n`,
  )

  buildgojswasm('zedsync', ZEDSYNC_PACKAGE, ZEDSYNC_STAGING_WASM)
  copyFileSync(ZEDSYNC_STAGING_WASM, ZEDSYNC_PUBLIC_WASM)
  process.stdout.write(
    `zedsync.wasm written to ${ZEDSYNC_STAGING_WASM} (copied to ${ZEDSYNC_PUBLIC_WASM})\n`,
  )
}
