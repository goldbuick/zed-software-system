/**
 * Pass/fail gate for play vs drum balance render.
 *
 * Usage:
 *   yarn play-drum-balance:test
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { RENDERS_FIXTURES_DIR } from 'zss/testsupport/fixturepaths'
import {
  type PLAY_DRUM_BALANCE_METRICS,
  evalplaydrumbalancegate,
  formatplaydrumbalancereport,
} from '../zss/feature/synth/backend/daisy/playdrumbalance.ts'
import { PLAY_DRUM_BALANCE_SCENARIO_ID } from '../zss/feature/synth/backend/daisy/playdrumbalancescenario.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const JSONPATH = path.join(RENDERS_FIXTURES_DIR,
  `${PLAY_DRUM_BALANCE_SCENARIO_ID}.json`,
)

type BALANCE_JSON = {
  balance: PLAY_DRUM_BALANCE_METRICS
}

function main() {
  if (!fs.existsSync(JSONPATH)) {
    console.error(`missing render JSON: ${JSONPATH}`)
    console.error('run: yarn play-drum-balance:render')
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
