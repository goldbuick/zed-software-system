import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

import {
  CAFE_PUBLIC_FINDPLAYERS_WASM,
  CAFE_PUBLIC_ZEDCAFE_WASM,
} from 'ops/lib/cafepublicpaths'
import {
  WANIX_FIXTURES_DIR,
  WANIX_PUBLIC_FIXTURES_DIR,
} from 'ops/lib/fixturepaths'

const WANIX_SUBMODULE_DIR = path.join(process.cwd(), 'submodules', 'wanix')
const ZEDCAFE_PACKAGE = path.join(WANIX_FIXTURES_DIR, 'zedcafe', 'main.go')
const FINDPLAYERS_PACKAGE = path.join(
  WANIX_FIXTURES_DIR,
  'findplayers',
  'cmd',
  'main.go',
)
const ZEDCAFE_STAGING_WASM = path.join(WANIX_PUBLIC_FIXTURES_DIR, 'zedcafe.wasm')
const FINDPLAYERS_STAGING_WASM = path.join(
  WANIX_PUBLIC_FIXTURES_DIR,
  'findplayers.wasm',
)
const ZEDCAFE_PUBLIC_WASM = CAFE_PUBLIC_ZEDCAFE_WASM
const FINDPLAYERS_PUBLIC_WASM = CAFE_PUBLIC_FINDPLAYERS_WASM

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

function buildgojspackage(label: string, pkg: string, outfile: string): void {
  process.stdout.write(`go build ${label} -> ${path.basename(outfile)}\n`)
  execFileSync('go', ['build', '-o', outfile, pkg], {
    cwd: WANIX_FIXTURES_DIR,
    stdio: 'inherit',
    env: GOJS_ENV,
  })
}

/**
 * Build zed-cafe export daemon and findplayers scanner (Go js/wasm) into
 * ops/public/wanix/ and copy to cafe/public/wanix/ for the runtime to load.
 */
export function buildwanixzedcafe(): void {
  requirego()
  requiregomod()
  requirewanixsubmodule()

  if (!existsSync(ZEDCAFE_PACKAGE)) {
    throw new Error(`missing ${ZEDCAFE_PACKAGE}`)
  }
  if (!existsSync(FINDPLAYERS_PACKAGE)) {
    throw new Error(`missing ${FINDPLAYERS_PACKAGE}`)
  }

  mkdirSync(WANIX_PUBLIC_FIXTURES_DIR, { recursive: true })
  mkdirSync(path.dirname(ZEDCAFE_PUBLIC_WASM), { recursive: true })

  buildgojspackage('zedcafe', './zedcafe', ZEDCAFE_STAGING_WASM)
  copyFileSync(ZEDCAFE_STAGING_WASM, ZEDCAFE_PUBLIC_WASM)
  process.stdout.write(
    `zedcafe.wasm written to ${ZEDCAFE_STAGING_WASM} (copied to ${ZEDCAFE_PUBLIC_WASM})\n`,
  )

  buildgojspackage('findplayers', './findplayers/cmd', FINDPLAYERS_STAGING_WASM)
  copyFileSync(FINDPLAYERS_STAGING_WASM, FINDPLAYERS_PUBLIC_WASM)
  process.stdout.write(
    `findplayers.wasm written to ${FINDPLAYERS_STAGING_WASM} (copied to ${FINDPLAYERS_PUBLIC_WASM})\n`,
  )
}
