/**
 * Pass/fail gate for synth env parity renders.
 *
 * Usage: yarn test:synth-env-parity
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  evalsynthenvparitygate,
  formatsynthenvparityreport,
  type SYNTH_ENV_PARITY_RESULT,
} from '../zss/feature/synth/backend/daisy/synthenvparitygate.ts'
import {
  SYNTH_ENV_PARITY_REQUIRED_IDS,
  SYNTH_ENV_PARITY_SCENARIOS,
} from '../zss/feature/synth/backend/daisy/synthenvparityscenario.ts'

import { EXEC_GATE_TIMEOUT_MS, withscripttimeout } from './parity-timeouts.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const OUTDIR = path.join(PROJECT, 'cafe/public/renders/synth-env-parity')

async function rungates() {
  let failed = false
  const lines: string[] = []

  for (const scenario of SYNTH_ENV_PARITY_SCENARIOS) {
    const jsonpath = path.join(OUTDIR, `${scenario.id}.json`)
    if (!fs.existsSync(jsonpath)) {
      console.error(`missing ${jsonpath}`)
      console.error('run: yarn render:synth-env-parity')
      process.exit(1)
    }
    const data = JSON.parse(fs.readFileSync(jsonpath, 'utf8')) as {
      result: SYNTH_ENV_PARITY_RESULT
    }
    const gate = evalsynthenvparitygate(data.result)
    const rendersec =
      data.result.metrics.gatesec + data.result.metrics.releasesec + 1.5
    lines.push(formatsynthenvparityreport(gate, rendersec))
    lines.push('')

    if (!gate.pass && gate.required) {
      failed = true
      console.error(`FAIL (required) ${scenario.id}: ${gate.reasons.join('; ')}`)
    } else if (!gate.pass) {
      console.warn(`WARN (advisory) ${scenario.id}: ${gate.reasons.join('; ')}`)
    }
  }

  console.log(lines.join('\n'))
  console.log(`Required scenarios: ${[...SYNTH_ENV_PARITY_REQUIRED_IDS].join(', ')}`)

  if (failed) {
    process.exit(1)
  }
}

withscripttimeout('test:synth-env-parity', EXEC_GATE_TIMEOUT_MS, rungates).catch((err) => {
  console.error(err)
  process.exit(1)
})
