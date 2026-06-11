/**
 * Evidence-based Daisy vs Tone compare for level-issue song renders.
 *
 * Usage:
 *   yarn level-issue-song-compare:test
 *
 * Requires:
 *   cafe/public/renders/level-issue-song.json
 *   cafe/public/renders/level-issue-song-tone.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { comparesongmetrics } from '../zss/feature/synth/backend/daisy/levelissuesongcompare.ts'
import type { LEVEL_STABILITY_METRICS } from '../zss/feature/synth/backend/wasm/levelstabilitymetrics.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const OUTDIR = path.join(PROJECT, 'cafe/public/renders')

type SONG_JSON = {
  meta: { scenarioid: string; rendersec: number }
  metrics: LEVEL_STABILITY_METRICS
}

function loadjson(filepath: string): SONG_JSON {
  return JSON.parse(fs.readFileSync(filepath, 'utf8')) as SONG_JSON
}

async function main() {
  const daisypath = path.join(OUTDIR, 'level-issue-song.json')
  const tonepath = path.join(OUTDIR, 'level-issue-song-tone.json')

  if (!fs.existsSync(daisypath) || !fs.existsSync(tonepath)) {
    console.error('Missing render JSON. Run:')
    console.error('  yarn level-issue-song:render')
    console.error('  yarn level-issue-song:render:tone')
    process.exit(1)
  }

  const daisy = loadjson(daisypath)
  const tone = loadjson(tonepath)
  const durationsec = Math.max(daisy.meta.rendersec, tone.meta.rendersec)

  const result = comparesongmetrics(
    daisy.meta.scenarioid,
    tone.meta.scenarioid,
    daisy.metrics,
    tone.metrics,
    durationsec,
  )

  const reportpath = path.join(OUTDIR, 'level-issue-song-compare.txt')
  const jsonpath = path.join(OUTDIR, 'level-issue-song-compare.json')

  fs.writeFileSync(reportpath, result.report)
  fs.writeFileSync(jsonpath, JSON.stringify(result, null, 2))

  console.log(result.report)
  console.log('')
  console.log(`Report: ${reportpath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
