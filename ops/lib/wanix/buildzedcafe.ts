import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

import {
  CAFE_PUBLIC_ZEDCAFE_WASM,
} from 'ops/lib/cafepublicpaths'
import {
  WANIX_FIXTURES_DIR,
  WANIX_PUBLIC_FIXTURES_DIR,
} from 'ops/lib/fixturepaths'

const WANIX_SUBMODULE_DIR = path.join(process.cwd(), 'submodules', 'wanix')
const ZEDCAFE_PACKAGE = path.join(WANIX_FIXTURES_DIR, 'zedcafe', 'main.go')
const ZEDCAFE_STAGING_WASM = path.join(WANIX_PUBLIC_FIXTURES_DIR, 'zedcafe.wasm')
const ZEDCAFE_PUBLIC_WASM = CAFE_PUBLIC_ZEDCAFE_WASM

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

/**
 * Build the zed-cafe export daemon (Go js/wasm) into ops/fixtures/public/wanix/
 * and copy it to cafe/public/wanix/ for the runtime to load.
 */
export function buildwanixzedcafe(): void {
  requirego()
  requiregomod()
  requirewanixsubmodule()

  if (!existsSync(ZEDCAFE_PACKAGE)) {
    throw new Error(`missing ${ZEDCAFE_PACKAGE}`)
  }

  mkdirSync(WANIX_PUBLIC_FIXTURES_DIR, { recursive: true })
  mkdirSync(path.dirname(ZEDCAFE_PUBLIC_WASM), { recursive: true })

  process.stdout.write('go build zedcafe -> zedcafe.wasm\n')
  execFileSync('go', ['build', '-o', ZEDCAFE_STAGING_WASM, './zedcafe'], {
    cwd: WANIX_FIXTURES_DIR,
    stdio: 'inherit',
    env: { ...process.env, GOOS: 'js', GOARCH: 'wasm' },
  })

  copyFileSync(ZEDCAFE_STAGING_WASM, ZEDCAFE_PUBLIC_WASM)
  process.stdout.write(
    `zedcafe.wasm written to ${ZEDCAFE_STAGING_WASM} (copied to ${ZEDCAFE_PUBLIC_WASM})\n`,
  )
}
