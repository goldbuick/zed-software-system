/**
 * Grid-search kScMix / kScMakeupDb for sidechain duck depth + bypass gate.
 *
 * Usage:
 *   yarn sidechain-parity:calibrate
 *   yarn sidechain-parity:calibrate --dry-run
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type SIDECHAIN_PARITY_RESULT,
  evalsidechainparitygate,
} from '../zss/feature/synth/backend/daisy/sidechainparity.ts'
import { SIDECHAIN_SCENARIO_ID } from '../zss/feature/synth/backend/daisy/sidechainscenario.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const CONFIG_PATH = path.join(
  PROJECT,
  'zss/feature/synth/backend/daisy/native/zss/zss_config.h',
)
const PARITY_JSON = path.join(
  PROJECT,
  'cafe/public/renders',
  `${SIDECHAIN_SCENARIO_ID}-sidechain-parity.json`,
)

const dryrun = process.argv.includes('--dry-run')

type SCPARAMS = {
  mix: number
  makeupdb: number
}

function readparams(): SCPARAMS {
  const text = fs.readFileSync(CONFIG_PATH, 'utf8')
  const mixmatch = /kScMix\s*=\s*([\d.]+)f/.exec(text)
  const makeupmatch = /kScMakeupDb\s*=\s*([\d.]+)f/.exec(text)
  return {
    mix: mixmatch ? parseFloat(mixmatch[1]) : 0.75,
    makeupdb: makeupmatch ? parseFloat(makeupmatch[1]) : 24,
  }
}

function writeparams(params: SCPARAMS) {
  let text = fs.readFileSync(CONFIG_PATH, 'utf8')
  text = text.replace(
    /constexpr float kScMix\s*=\s*[\d.]+f;/,
    `constexpr float kScMix = ${params.mix.toFixed(3)}f;`,
  )
  text = text.replace(
    /constexpr float kScMakeupDb\s*=\s*[\d.]+f;/,
    `constexpr float kScMakeupDb = ${params.makeupdb.toFixed(1)}f;`,
  )
  fs.writeFileSync(CONFIG_PATH, text)
}

function builddaisy() {
  execSync('yarn daisy:build', { cwd: PROJECT, stdio: 'inherit' })
}

function measure(): SIDECHAIN_PARITY_RESULT {
  execSync('yarn sidechain-parity:render', { cwd: PROJECT, stdio: 'inherit' })
  const data = JSON.parse(fs.readFileSync(PARITY_JSON, 'utf8')) as {
    result: SIDECHAIN_PARITY_RESULT
  }
  return data.result
}

function score(result: SIDECHAIN_PARITY_RESULT): number {
  const gate = evalsidechainparitygate(result)
  if (gate.pass) {
    return 0
  }
  let err = 0
  if (result.duckon.duckdepthdb < 4) {
    err += (4 - result.duckon.duckdepthdb) * 2
  }
  if (result.duckoff.duckdepthdb > 2) {
    err += (result.duckoff.duckdepthdb - 2) * 3
  }
  err += Math.abs(onduck - 6) * 0.25
  return err
}

async function main() {
  const original = readparams()
  console.log('Original sidechain params:', original)

  let best = {
    params: original,
    result: null as SIDECHAIN_PARITY_RESULT | null,
    err: 999,
  }

  for (let makeupdb = 18; makeupdb <= 30.1; makeupdb += 2) {
    for (let mix = 0.55; mix <= 1.001; mix += 0.05) {
      const params = { mix, makeupdb }
      console.log(
        `\n▶ kScMix=${mix.toFixed(2)} kScMakeupDb=${makeupdb.toFixed(0)}`,
      )
      if (!dryrun) {
        writeparams(params)
        builddaisy()
      }
      const result = dryrun
        ? {
            duckon: {
              duckdepthdb: 0,
              prepeakdb: 0,
              postpeakdb: 0,
              stabtime: 0.75,
            },
            duckoff: {
              duckdepthdb: 0,
              prepeakdb: 0,
              postpeakdb: 0,
              stabtime: 0.75,
            },
            abduckdepthdb: 0,
          }
        : measure()
      const err = score(result)
      const gate = evalsidechainparitygate(result)
      console.log(
        `  A/B=${result.abduckdepthdb.toFixed(1)} ON=${result.duckon.duckdepthdb.toFixed(1)} OFF leak=${result.duckoff.duckdepthdb.toFixed(1)} err=${err.toFixed(2)} ${gate.pass ? 'PASS' : ''}`,
      )
      if (err < best.err) {
        best = { params, result, err }
      }
      if (gate.pass) {
        best = { params, result, err }
        break
      }
    }
    if (best.err === 0) {
      break
    }
  }

  console.log('\nBest:', best.params, `err=${best.err.toFixed(2)}`)

  if (!dryrun && best.result) {
    writeparams(best.params)
    builddaisy()
    execSync('yarn sidechain-parity:test', { cwd: PROJECT, stdio: 'inherit' })
  } else {
    writeparams(original)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
