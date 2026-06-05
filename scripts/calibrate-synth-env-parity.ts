/**
 * Grid-search kEnvDecayTauScale / kEnvReleaseTauScale for synth env parity.
 *
 * Usage:
 *   yarn calibrate:synth-env-parity
 *   yarn calibrate:synth-env-parity --dry-run
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type SYNTH_ENV_PARITY_RESULT,
  evalsynthenvparitygate,
} from '../zss/feature/synth/backend/daisy/synthenvparitygate.ts'
import {
  SYNTH_ENV_PARITY_REQUIRED_IDS,
  SYNTH_ENV_PARITY_SCENARIOS,
} from '../zss/feature/synth/backend/daisy/synthenvparityscenario.ts'

import {
  CALIBRATE_SCRIPT_TIMEOUT_MS,
  EXEC_BUILD_DAISY_TIMEOUT_MS,
  EXEC_CALIBRATE_STEP_TIMEOUT_MS,
  EXEC_GATE_TIMEOUT_MS,
  EXEC_RENDER_PARITY_TIMEOUT_MS,
  withscripttimeout,
} from './parity-timeouts.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const CONFIG_PATH = path.join(
  PROJECT,
  'zss/feature/synth/backend/daisy/native/zss/zss_config.h',
)
const OUTDIR = path.join(PROJECT, 'cafe/public/renders/synth-env-parity')

const dryrun = process.argv.includes('--dry-run')

type ENVPARAMS = {
  decayscale: number
  releasescale: number
}

function readparams(): ENVPARAMS {
  const text = fs.readFileSync(CONFIG_PATH, 'utf8')
  const decaymatch = /kEnvDecayTauScale\s*=\s*([\d.]+)f/.exec(text)
  const releasematch = /kEnvReleaseTauScale\s*=\s*([\d.]+)f/.exec(text)
  return {
    decayscale: decaymatch ? parseFloat(decaymatch[1]) : 1,
    releasescale: releasematch ? parseFloat(releasematch[1]) : 1,
  }
}

function writeparams(params: ENVPARAMS) {
  let text = fs.readFileSync(CONFIG_PATH, 'utf8')
  text = text.replace(
    /constexpr float kEnvDecayTauScale\s*=\s*[\d.]+f;/,
    `constexpr float kEnvDecayTauScale = ${params.decayscale.toFixed(3)}f;`,
  )
  text = text.replace(
    /constexpr float kEnvReleaseTauScale\s*=\s*[\d.]+f;/,
    `constexpr float kEnvReleaseTauScale = ${params.releasescale.toFixed(3)}f;`,
  )
  fs.writeFileSync(CONFIG_PATH, text)
}

function builddaisy() {
  execSync('yarn build:daisy', {
    cwd: PROJECT,
    stdio: 'inherit',
    timeout: EXEC_BUILD_DAISY_TIMEOUT_MS,
  })
}

function measurerequired(): {
  pass: boolean
  err: number
  results: SYNTH_ENV_PARITY_RESULT[]
} {
  execSync('yarn render:synth-env-parity', {
    cwd: PROJECT,
    stdio: 'inherit',
    timeout: EXEC_RENDER_PARITY_TIMEOUT_MS,
  })
  const results: SYNTH_ENV_PARITY_RESULT[] = []
  let err = 0
  let allpass = true
  for (const scenario of SYNTH_ENV_PARITY_SCENARIOS) {
    if (!SYNTH_ENV_PARITY_REQUIRED_IDS.has(scenario.id)) {
      continue
    }
    const jsonpath = path.join(OUTDIR, `${scenario.id}.json`)
    const data = JSON.parse(fs.readFileSync(jsonpath, 'utf8')) as {
      result: SYNTH_ENV_PARITY_RESULT
    }
    const gate = evalsynthenvparitygate(data.result)
    results.push(data.result)
    if (!gate.pass) {
      allpass = false
      for (const reason of gate.reasons) {
        if (reason.includes('sustain')) {
          err += 3
        }
        if (reason.includes('release')) {
          err += 2
        }
        if (reason.includes('silent')) {
          err += 5
        }
      }
    }
  }
  return { pass: allpass, err, results }
}

async function main() {
  const original = readparams()
  console.log('Original env tau scales:', original)

  let best = { params: original, err: 999, pass: false }

  for (let releasescale = 0.04; releasescale <= 0.351; releasescale += 0.04) {
    for (let decayscale = 0.5; decayscale <= 1.101; decayscale += 0.1) {
      const params = { decayscale, releasescale }
      console.log(
        `\n▶ kEnvDecayTauScale=${decayscale.toFixed(2)} kEnvReleaseTauScale=${releasescale.toFixed(2)}`,
      )
      if (!dryrun) {
        writeparams(params)
        builddaisy()
      }
      const { pass, err } = dryrun
        ? { pass: false, err: 999 }
        : measurerequired()
      console.log(`  err=${err.toFixed(0)} ${pass ? 'PASS' : ''}`)
      if (err < best.err) {
        best = { params, err, pass }
      }
      if (pass) {
        best = { params, err: 0, pass: true }
        break
      }
    }
    if (best.pass) {
      break
    }
  }

  console.log('\nBest:', best.params, best.pass ? 'PASS' : `err=${best.err}`)

  if (!dryrun) {
    writeparams(best.params)
    builddaisy()
    execSync('yarn test:synth-env-parity', {
      cwd: PROJECT,
      stdio: 'inherit',
      timeout: EXEC_GATE_TIMEOUT_MS,
    })
  } else {
    writeparams(original)
  }
}

withscripttimeout(
  'calibrate:synth-env-parity',
  CALIBRATE_SCRIPT_TIMEOUT_MS,
  main,
).catch((err) => {
  console.error(err)
  process.exit(1)
})
