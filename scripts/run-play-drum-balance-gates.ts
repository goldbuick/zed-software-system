/**
 * Pass/fail gate for play vs drum balance render.
 *
 * Usage:
 *   yarn test:play-drum-balance
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type PLAY_DRUM_BALANCE_METRICS,
  evalplaydrumbalancegate,
  formatplaydrumbalancereport,
} from '../zss/feature/synth/backend/daisy/playdrumbalance.ts'
import { PLAY_DRUM_BALANCE_SCENARIO_ID } from '../zss/feature/synth/backend/daisy/playdrumbalancescenario.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const JSONPATH = path.join(
  PROJECT,
  'cafe/public/renders',
  `${PLAY_DRUM_BALANCE_SCENARIO_ID}.json`,
)

type BALANCE_JSON = {
  balance: PLAY_DRUM_BALANCE_METRICS
}

function main() {
  if (!fs.existsSync(JSONPATH)) {
    console.error(`missing render JSON: ${JSONPATH}`)
    console.error('run: yarn render:play-drum-balance')
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(JSONPATH, 'utf8')) as BALANCE_JSON
  const gate = evalplaydrumbalancegate(data.balance)
  console.log(formatplaydrumbalancereport(gate))
  if (!gate.pass) {
    process.exit(1)
  }
}

main()
