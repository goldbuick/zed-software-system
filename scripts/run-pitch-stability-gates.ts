/**
 * Pass/fail gate for pitch-stability offline render.
 *
 * Usage:
 *   yarn test:pitch-stability
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  evalpitchstabilitygate,
  formatpitchstabilityreport,
  type PITCH_STABILITY_METRICS,
} from '../zss/feature/synth/backend/daisy/pitchstability.ts'
import { PITCH_STABILITY_SCENARIO_ID } from '../zss/feature/synth/backend/daisy/pitchstabilityscenario.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const JSONPATH = path.join(
  PROJECT,
  'cafe/public/renders',
  `${PITCH_STABILITY_SCENARIO_ID}.json`,
)

type PITCH_JSON = {
  pitchmetrics: PITCH_STABILITY_METRICS
  gate?: { pass: boolean; reasons: string[] }
}

function main() {
  if (!fs.existsSync(JSONPATH)) {
    console.error(`missing render JSON: ${JSONPATH}`)
    console.error('run: yarn render:pitch-stability')
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
