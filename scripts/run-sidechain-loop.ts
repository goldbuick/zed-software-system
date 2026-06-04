/**
 * Watch native sources → build → sidechain parity → gate; calibrate on fail.
 *
 * Usage:
 *   yarn loop:sidechain
 *   yarn loop:sidechain --skip-build
 *   yarn loop:sidechain --calibrate-only
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const NATIVEDIR = path.join(
  PROJECT,
  'zss/feature/synth/backend/daisy/native',
)

function daisynativemtime(): number {
  let max = 0
  function walk(dir: string) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'DaisySP' || ent.name === 'DaisySP-LGPL') {
        continue
      }
      const p = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        walk(p)
      } else if (/\.(cpp|h)$/.test(ent.name)) {
        max = Math.max(max, fs.statSync(p).mtimeMs)
      }
    }
  }
  walk(NATIVEDIR)
  return max
}

const POLL_MS = 2000
const DEBOUNCE_MS = 1000
const skipbuild = process.argv.includes('--skip-build')
const calibrateonly = process.argv.includes('--calibrate-only')

function runpipeline(): boolean {
  try {
    if (calibrateonly) {
      execSync('yarn calibrate:sidechain-parity', {
        cwd: PROJECT,
        stdio: 'inherit',
      })
      return true
    }
    if (!skipbuild) {
      execSync('yarn build:daisy', { cwd: PROJECT, stdio: 'inherit' })
    }
    execSync('yarn render:sidechain-parity', { cwd: PROJECT, stdio: 'inherit' })
    try {
      execSync('yarn test:sidechain-parity', { cwd: PROJECT, stdio: 'inherit' })
      return true
    } catch {
      console.log('Sidechain gate failed — running calibrator…')
      execSync('yarn calibrate:sidechain-parity', {
        cwd: PROJECT,
        stdio: 'inherit',
      })
      execSync('yarn test:sidechain-parity', { cwd: PROJECT, stdio: 'inherit' })
      return true
    }
  } catch {
    return false
  }
}

async function main() {
  if (calibrateonly) {
    const pass = runpipeline()
    console.log(pass ? 'SIDECHAIN_LOOP_PASS' : 'SIDECHAIN_LOOP_FAIL')
    process.exit(pass ? 0 : 1)
  }

  let lastmtime = daisynativemtime()
  let pending: ReturnType<typeof setTimeout> | undefined

  console.log(`Watching ${NATIVEDIR}`)
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    const mtime = daisynativemtime()
    if (mtime === lastmtime) {
      continue
    }
    lastmtime = mtime
    if (pending) {
      clearTimeout(pending)
    }
    pending = setTimeout(() => {
      console.log('\n▶ Native changed — sidechain parity pipeline…')
      const pass = runpipeline()
      console.log(pass ? 'SIDECHAIN_LOOP_PASS' : 'SIDECHAIN_LOOP_FAIL')
    }, DEBOUNCE_MS)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
