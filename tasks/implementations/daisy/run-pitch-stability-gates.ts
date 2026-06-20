/**
 * Pass/fail gate for pitch-stability offline render.
 *
 * Usage:
 *   yarn pitch-stability:test
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { RENDERS_FIXTURES_DIR } from 'zss/testsupport/fixturepaths'
import {
  type PITCH_STABILITY_METRICS,
  evalpitchstabilitygate,
  formatpitchstabilityreport,
} from '../zss/feature/synth/backend/daisy/pitchstability.ts'
import { PITCH_STABILITY_SCENARIO_ID } from '../zss/feature/synth/backend/daisy/pitchstabilityscenario.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const JSONPATH = path.join(RENDERS_FIXTURES_DIR,
  `${PITCH_STABILITY_SCENARIO_ID}.json`,
)

type PITCH_JSON = {
  pitchmetrics: PITCH_STABILITY_METRICS
  gate?: { pass: boolean; reasons: string[] }
}

function main() {
  if (!fs.existsSync(JSONPATH)) {
    console.error(`missing render JSON: ${JSONPATH}`)
    console.error('run: yarn pitch-stability:render')
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(JSONPATH, 'utf8')) as PITCH_JSON
  const gate = evalpitchstabilitygate(data.pitchmetrics)
  console.log(formatpitchstabilityreport(PITCH_STABILITY_SCENARIO_ID, gate))
  if (!gate.pass) {
    process.exit(1)
  }
}

main()
