/**
 * Grid-search kDrumBusGain / kPlayBusGain for play-drum balance gate.
 *
 * Usage:
 *   yarn play-drum-balance:calibrate
 *   yarn play-drum-balance:calibrate --dry-run
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type PLAY_DRUM_BALANCE_METRICS,
  PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB,
  evalplaydrumbalancegate,
} from '../zss/feature/synth/backend/daisy/playdrumbalance.ts'
import { PLAY_DRUM_BALANCE_SCENARIO_ID } from '../zss/feature/synth/backend/daisy/playdrumbalancescenario.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const CONFIG_PATH = path.join(
  PROJECT,
  'zss/feature/synth/backend/daisy/native/zss/zss_config.h',
)
const BALANCE_JSON = path.join(
  PROJECT,
  'cafe/public/renders',
  `${PLAY_DRUM_BALANCE_SCENARIO_ID}.json`,
)

const dryrun = process.argv.includes('--dry-run')

type GAINS = {
  playbus: number
  drumbus: number
}

function readgains(): GAINS {
  const text = fs.readFileSync(CONFIG_PATH, 'utf8')
  const playmatch = /kPlayBusGain\s*=\s*([\d.]+)f/.exec(text)
  const drummatch = /kDrumBusGain\s*=\s*([\d.]+)f/.exec(text)
  return {
    playbus: playmatch ? parseFloat(playmatch[1]) : 0.5,
    drumbus: drummatch ? parseFloat(drummatch[1]) : 0.167,
  }
}

function writegains(gains: GAINS) {
  let text = fs.readFileSync(CONFIG_PATH, 'utf8')
  text = text.replace(
    /constexpr float kPlayBusGain\s*=\s*[\d.]+f;/,
    `constexpr float kPlayBusGain = ${gains.playbus.toFixed(3)}f;`,
  )
  text = text.replace(
    /constexpr float kDrumBusGain\s*=\s*[\d.]+f;/,
    `constexpr float kDrumBusGain = ${gains.drumbus.toFixed(3)}f;`,
  )
  fs.writeFileSync(CONFIG_PATH, text)
}

function builddaisy() {
  execSync('yarn task run daisy:build', { cwd: PROJECT, stdio: 'inherit' })
}

function renderandmeasure(): PLAY_DRUM_BALANCE_METRICS {
  execSync('yarn task run daisy:play-drum-balance:render', { cwd: PROJECT, stdio: 'inherit' })
  const data = JSON.parse(fs.readFileSync(BALANCE_JSON, 'utf8')) as {
    balance: PLAY_DRUM_BALANCE_METRICS
  }
  return data.balance
}

function score(delta: number): number {
  return Math.abs(delta - PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB)
}

async function main() {
  const original = readgains()
  console.log('Original gains:', original)

  let best = { gains: original, delta: -999, err: 999 }
  const candidates: GAINS[] = []

  for (let drumbus = 0.12; drumbus <= 2.5 + 1e-6; drumbus += 0.08) {
    candidates.push({ playbus: original.playbus, drumbus })
  }

  for (const gains of candidates) {
    console.log(
      `\n▶ kPlayBusGain=${gains.playbus.toFixed(3)} kDrumBusGain=${gains.drumbus.toFixed(3)}`,
    )
    if (!dryrun) {
      writegains(gains)
      builddaisy()
    }

    const balance = dryrun
      ? { playpeakdb: 0, drumpeakdb: 0, drumminusplaydb: -999 }
      : renderandmeasure()
    const delta = balance.drumminusplaydb
    const err = score(delta)
    const gate = evalplaydrumbalancegate(balance)
    console.log(
      `  drum−play=${delta.toFixed(2)} dB err=${err.toFixed(2)} ${gate.pass ? 'PASS' : 'miss'}`,
    )

    if (err < best.err) {
      best = { gains, delta, err }
    }
    if (gate.pass) {
      best = { gains, delta, err }
      break
    }
  }

  if (best.err > 0.5) {
    console.log('\nCo-search kPlayBusGain with best drum bus…')
    const drumbus = best.gains.drumbus
    for (let playbus = 0.25; playbus <= 0.55 + 1e-6; playbus += 0.05) {
      const gains = { playbus, drumbus }
      console.log(
        `\n▶ kPlayBusGain=${gains.playbus.toFixed(3)} kDrumBusGain=${gains.drumbus.toFixed(3)}`,
      )
      if (!dryrun) {
        writegains(gains)
        builddaisy()
      }
      const balance = dryrun
        ? { playpeakdb: 0, drumpeakdb: 0, drumminusplaydb: -999 }
        : renderandmeasure()
      const delta = balance.drumminusplaydb
      const err = score(delta)
      const gate = evalplaydrumbalancegate(balance)
      console.log(
        `  drum−play=${delta.toFixed(2)} dB err=${err.toFixed(2)} ${gate.pass ? 'PASS' : 'miss'}`,
      )
      if (err < best.err) {
        best = { gains, delta, err }
      }
      if (gate.pass) {
        best = { gains, delta, err }
        break
      }
    }
  }

  console.log('\nBest:', best.gains, `drum−play=${best.delta.toFixed(2)} dB`)

  if (!dryrun) {
    writegains(best.gains)
    builddaisy()
    console.log('Wrote best gains to zss_config.h and rebuilt.')
    execSync('yarn task run daisy:play-drum-balance:test', { cwd: PROJECT, stdio: 'inherit' })
  } else {
    writegains(original)
    console.log('Dry run — restored original gains in file.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
