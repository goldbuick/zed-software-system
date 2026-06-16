/**
 * Repeatedly run the host+join movement Playwright repro.
 *
 * Usage:
 *   yarn join-move:loop
 *   yarn join-move:loop -- --max 5
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT = process.cwd()

function parseargs() {
  const argv = process.argv.slice(2)
  const maxidx = argv.indexOf('--max')
  const maxruns = maxidx >= 0 ? Number(argv[maxidx + 1]) : 0
  return { maxruns: Number.isFinite(maxruns) && maxruns > 0 ? maxruns : 0 }
}

function runonce(): number {
  const env = {
    ...process.env,
    PLAYWRIGHT_INCLUDE_JOIN_E2E: '1',
  }
  const result = spawnSync('yarn', ['e2e:test:join-move'], {
    stdio: 'inherit',
    cwd: PROJECT,
    env,
    shell: process.platform === 'win32',
  })
  return result.status ?? 1
}

function main() {
  const { maxruns } = parseargs()
  let run = 0
  while (maxruns === 0 || run < maxruns) {
    run += 1
    console.log(`\n[join-move loop ${run}${maxruns ? `/${maxruns}` : ''}]`)
    const code = runonce()
    if (code !== 0) {
      process.exit(code)
    }
  }
}

main()
