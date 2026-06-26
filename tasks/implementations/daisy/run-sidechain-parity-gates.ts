/**
 * Pass/fail gate for sidechain parity render.
 *
 * Usage:
 *   yarn sidechain-parity:test
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type SIDECHAIN_PARITY_RESULT,
  evalsidechainparitygate,
  formatsidechainparityreport,
} from 'ops/lib/daisy-parity/sidechainparity'
import { RENDERS_FIXTURES_DIR } from 'ops/lib/fixturepaths'

import { SIDECHAIN_SCENARIO_ID } from '../zss/feature/synth/backend/daisy/sidechainscenario.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const JSONPATH = path.join(
  RENDERS_FIXTURES_DIR,
  `${SIDECHAIN_SCENARIO_ID}-sidechain-parity.json`,
)

function main() {
  if (!fs.existsSync(JSONPATH)) {
    console.error(`missing ${JSONPATH}`)
    console.error('run: yarn sidechain-parity:render')
    process.exit(1)
  }
  const data = JSON.parse(fs.readFileSync(JSONPATH, 'utf8')) as {
    result: SIDECHAIN_PARITY_RESULT
  }
  const gate = evalsidechainparitygate(data.result)
  console.log(formatsidechainparityreport(gate))
  if (!gate.pass) {
    process.exit(1)
  }
}

main()
