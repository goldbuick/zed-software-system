/**
 * Local Daisy regression: Jest unit gates + one build + critical Playwright :full suites.
 * Not run in CI (see on-pr-check.yml). Use before merging native DSP changes.
 *
 * Usage:
 *   yarn test:daisy-regression
 *   yarn test:daisy-regression --skip-playwright
 */
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  EXEC_GATE_TIMEOUT_MS,
  EXEC_RENDER_PARITY_TIMEOUT_MS,
  PARITY_RENDER_SCRIPT_TIMEOUT_MS,
  withscripttimeout,
} from './parity-timeouts.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')

const SKIP_PLAYWRIGHT = process.argv.includes('--skip-playwright')

const JEST_PATHS = [
  'zss/feature/synth/backend/daisy/__tests__',
  'zss/feature/synth/backend/wasm/__tests__/adsrenvcurve.test.ts',
]

const SOS_VOICE_GATE = 'yarn test:sos-voices'

const PLAYWRIGHT_FULL: { name: string; cmd: string }[] = [
  { name: 'pitch-stability', cmd: 'yarn test:pitch-stability:full' },
  { name: 'play-drum-balance', cmd: 'yarn test:play-drum-balance:full' },
  { name: 'sidechain-parity', cmd: 'yarn test:sidechain-parity:full' },
  { name: 'synth-env-parity', cmd: 'yarn test:synth-env-parity:full' },
  { name: 'notepop', cmd: 'yarn test:notepop:full' },
]

type STEPREPORT = { name: string; pass: boolean; detail?: string }

function runstep(name: string, cmd: string, timeoutms: number): STEPREPORT {
  console.log(`\n▶ ${name}\n   ${cmd}\n`)
  try {
    execSync(cmd, { cwd: PROJECT, stdio: 'inherit', timeout: timeoutms })
    return { name, pass: true }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { name, pass: false, detail }
  }
}

async function main() {
  const reports: STEPREPORT[] = []

  reports.push(
    runstep(
      'jest-daisy',
      `yarn jest ${JEST_PATHS.join(' ')} --verbose`,
      EXEC_GATE_TIMEOUT_MS * 2,
    ),
  )
  if (!reports[reports.length - 1].pass) {
    printsummary(reports)
    process.exit(1)
  }

  reports.push(
    runstep('sos-voices', SOS_VOICE_GATE, EXEC_RENDER_PARITY_TIMEOUT_MS),
  )
  if (!reports[reports.length - 1].pass) {
    printsummary(reports)
    process.exit(1)
  }

  if (SKIP_PLAYWRIGHT) {
    console.log('\n(skip Playwright — --skip-playwright)')
    printsummary(reports)
    return
  }

  for (const suite of PLAYWRIGHT_FULL) {
    reports.push(
      runstep(
        suite.name,
        suite.cmd,
        EXEC_RENDER_PARITY_TIMEOUT_MS + EXEC_GATE_TIMEOUT_MS,
      ),
    )
    if (!reports[reports.length - 1].pass) {
      printsummary(reports)
      process.exit(1)
    }
  }

  reports.push(
    runstep(
      'adsr-parity',
      'yarn test:adsr-parity',
      PARITY_RENDER_SCRIPT_TIMEOUT_MS,
    ),
  )

  printsummary(reports)
  if (!reports.every((r) => r.pass)) {
    process.exit(1)
  }
}

function printsummary(reports: STEPREPORT[]) {
  console.log('\n── Daisy regression summary ──')
  for (const r of reports) {
    console.log(
      `  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`,
    )
  }
}

withscripttimeout(
  'test:daisy-regression',
  PARITY_RENDER_SCRIPT_TIMEOUT_MS * 6,
  main,
).catch((err) => {
  console.error(err)
  process.exit(1)
})
