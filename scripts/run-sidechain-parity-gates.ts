/**
 * Pass/fail gate for sidechain parity render.
 *
 * Usage:
 *   yarn test:sidechain-parity
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  evalsidechainparitygate,
  formatsidechainparityreport,
  type SIDECHAIN_PARITY_RESULT,
} from '../zss/feature/synth/backend/daisy/sidechainparity.ts'
import { SIDECHAIN_SCENARIO_ID } from '../zss/feature/synth/backend/daisy/sidechainscenario.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const JSONPATH = path.join(
  PROJECT,
  'cafe/public/renders',
  `${SIDECHAIN_SCENARIO_ID}-sidechain-parity.json`,
)

function main() {
  if (!fs.existsSync(JSONPATH)) {
    console.error(`missing ${JSONPATH}`)
    console.error('run: yarn render:sidechain-parity')
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
