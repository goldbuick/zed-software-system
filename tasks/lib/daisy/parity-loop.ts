/**
 * Watch Daisy native → build → parity render → gate; optional calibrate on fail.
 *
 * Usage:
 *   yarn play-drum:loop
 *   npx tsx scripts/run-daisy-parity-loop.ts --suite sidechain
 *   npx tsx scripts/run-daisy-parity-loop.ts --suite synth-env --calibrate-on-fail
 */
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DAISY_NATIVE_DIR,
  DAISY_WATCH_DEBOUNCE_MS,
  DAISY_WATCH_POLL_MS,
  daisynativemtime,
} from 'tasks/lib/daisy/daisynativewatch.ts'
import {
  CALIBRATE_SCRIPT_TIMEOUT_MS,
  EXEC_BUILD_DAISY_TIMEOUT_MS,
  EXEC_GATE_TIMEOUT_MS,
  EXEC_RENDER_PARITY_TIMEOUT_MS,
} from 'tasks/lib/parity/parity-timeouts.ts'

const PROJECT = process.cwd()

export type DAISY_PARITY_SUITE =
  | 'play-drum'
  | 'sidechain'
  | 'synth-env'
  | 'notepop'
  | 'pitch'

const SUITE_CONFIG: Record<
  DAISY_PARITY_SUITE,
  { render: string; test: string; calibrate: string; label: string }
> = {
  'play-drum': {
    label: 'play/drum balance',
    render: 'yarn task run daisy:play-drum-balance:render',
    test: 'yarn task run daisy:play-drum-balance:test',
    calibrate: 'yarn task run daisy:play-drum-balance:calibrate',
  },
  sidechain: {
    label: 'sidechain',
    render: 'yarn task run daisy:sidechain:parity:render',
    test: 'yarn task run daisy:sidechain:parity:test',
    calibrate: 'yarn task run daisy:sidechain:parity:calibrate',
  },
  'synth-env': {
    label: 'synth env',
    render: 'yarn task run daisy:synth-env:render',
    test: 'yarn task run daisy:synth-env:test',
    calibrate: 'yarn task run daisy:synth-env:calibrate',
  },
  notepop: {
    label: 'notepop',
    render: 'yarn task run daisy:notepop:render:ab',
    test: 'yarn task run daisy:notepop:test',
    calibrate: '',
  },
  pitch: {
    label: 'pitch stability',
    render: 'yarn task run daisy:pitch-stability:render',
    test: 'yarn task run daisy:pitch-stability:test',
    calibrate: '',
  },
}

function parsesuite(): DAISY_PARITY_SUITE {
  const idx = process.argv.indexOf('--suite')
  const name = idx >= 0 ? process.argv[idx + 1] : 'play-drum'
  if (!name || !(name in SUITE_CONFIG)) {
    console.error(
      `usage: --suite ${Object.keys(SUITE_CONFIG).join('|')} (default play-drum)`,
    )
    process.exit(1)
  }
  return name as DAISY_PARITY_SUITE
}

function runpipeline(
  suite: DAISY_PARITY_SUITE,
  opts: {
    skipbuild: boolean
    calibrateonly: boolean
    calibrateonfail: boolean
  },
): boolean {
  const cfg = SUITE_CONFIG[suite]
  try {
    if (opts.calibrateonly) {
      if (!cfg.calibrate) {
        console.error(`suite ${suite} has no calibrate script`)
        return false
      }
      execSync(cfg.calibrate, {
        cwd: PROJECT,
        stdio: 'inherit',
        timeout: CALIBRATE_SCRIPT_TIMEOUT_MS,
      })
      return true
    }
    if (!opts.skipbuild) {
      execSync('yarn task run daisy:build', {
        cwd: PROJECT,
        stdio: 'inherit',
        timeout: EXEC_BUILD_DAISY_TIMEOUT_MS,
      })
    }
    execSync(cfg.render, {
      cwd: PROJECT,
      stdio: 'inherit',
      timeout: EXEC_RENDER_PARITY_TIMEOUT_MS,
    })
    try {
      execSync(cfg.test, {
        cwd: PROJECT,
        stdio: 'inherit',
        timeout: EXEC_GATE_TIMEOUT_MS,
      })
      return true
    } catch {
      if (!opts.calibrateonfail || !cfg.calibrate) {
        return false
      }
      console.log(`${cfg.label} gate failed — running calibrator…`)
      execSync(cfg.calibrate, {
        cwd: PROJECT,
        stdio: 'inherit',
        timeout: CALIBRATE_SCRIPT_TIMEOUT_MS,
      })
      execSync(cfg.test, {
        cwd: PROJECT,
        stdio: 'inherit',
        timeout: EXEC_GATE_TIMEOUT_MS,
      })
      return true
    }
  } catch {
    return false
  }
}

async function main() {
  const suite = parsesuite()
  const skipbuild = process.argv.includes('--skip-build')
  const calibrateonly = process.argv.includes('--calibrate-only')
  const calibrateonfail = process.argv.includes('--calibrate-on-fail')
  const cfg = SUITE_CONFIG[suite]

  if (calibrateonly) {
    const pass = runpipeline(suite, {
      skipbuild,
      calibrateonly,
      calibrateonfail,
    })
    console.log(pass ? 'DAISY_LOOP_PASS' : 'DAISY_LOOP_FAIL')
    process.exit(pass ? 0 : 1)
  }

  let lastmtime = daisynativemtime()
  let pending: ReturnType<typeof setTimeout> | undefined

  console.log(`Watching ${DAISY_NATIVE_DIR}`)
  console.log(`Suite: ${suite} (${cfg.label})`)
  console.log(
    skipbuild
      ? `Pipeline: render → gate${calibrateonfail ? ' (calibrate on fail)' : ''}`
      : `Pipeline: build → render → gate${calibrateonfail ? ' (calibrate on fail)' : ''}`,
  )

  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, DAISY_WATCH_POLL_MS))
    const mtime = daisynativemtime()
    if (mtime === lastmtime) {
      continue
    }
    lastmtime = mtime
    if (pending) {
      clearTimeout(pending)
    }
    pending = setTimeout(() => {
      console.log(`\n▶ Native changed — ${cfg.label} pipeline…`)
      const pass = runpipeline(suite, {
        skipbuild,
        calibrateonly,
        calibrateonfail,
      })
      console.log(pass ? 'DAISY_LOOP_PASS' : 'DAISY_LOOP_FAIL')
    }, DAISY_WATCH_DEBOUNCE_MS)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
