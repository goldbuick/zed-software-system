/**
 * Objective pass/fail gates for notepop comp-on vs comp-off renders.
 *
 * Usage:
 *   yarn notepop:test
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type NOTEPOP_RENDER_METRICS,
  evalnotepopgates,
  formatnotepopgatereport,
} from '../zss/feature/synth/backend/daisy/notepopgates.ts'
import {
  NOTEPOP_SCENARIO_ID,
  notepopmeta,
} from '../zss/feature/synth/backend/daisy/notepopscenario.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const OUTDIR = path.join(PROJECT, 'cafe/public/renders')

type NOTEPOP_JSON = NOTEPOP_RENDER_METRICS & {
  notepopmeta?: ReturnType<typeof notepopmeta>
}

function loadmetrics(suffix: string): NOTEPOP_JSON {
  const jsonpath = path.join(OUTDIR, `${NOTEPOP_SCENARIO_ID}${suffix}.json`)
  if (!fs.existsSync(jsonpath)) {
    throw new Error(`missing render JSON: ${jsonpath}`)
  }
  return JSON.parse(fs.readFileSync(jsonpath, 'utf8')) as NOTEPOP_JSON
}

function main() {
  const compon = loadmetrics('-comp-on')
  const compoff = loadmetrics('-comp-off')
  const meta = compon.notepopmeta ?? compoff.notepopmeta ?? notepopmeta()
  const report = evalnotepopgates(compon, compoff, meta)
  console.log(formatnotepopgatereport(report))
  if (!report.pass) {
    process.exit(1)
  }
}

main()
