import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

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
const FINDPLAYERS_STAGING_WASM = path.join(
  WANIX_PUBLIC_FIXTURES_DIR,
  'findplayers.wasm',
)

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

/** Build findplayers gojs scanner into ops/public/wanix/ (fixture only). */
export function buildwanixfindplayers(): void {
  requirego()
  requiregomod()
  requirewanixsubmodule()

  if (!existsSync(FINDPLAYERS_PACKAGE)) {
    throw new Error(`missing ${FINDPLAYERS_PACKAGE}`)
  }

  mkdirSync(WANIX_PUBLIC_FIXTURES_DIR, { recursive: true })

  process.stdout.write('go build findplayers -> findplayers.wasm\n')
  execFileSync('go', ['build', '-o', FINDPLAYERS_STAGING_WASM, './findplayers/cmd'], {
    cwd: WANIX_FIXTURES_DIR,
    stdio: 'inherit',
    env: GOJS_ENV,
  })
  process.stdout.write(
    `findplayers.wasm written to ${FINDPLAYERS_STAGING_WASM} (fixture only — not copied to cafe/public)\n`,
  )
}
