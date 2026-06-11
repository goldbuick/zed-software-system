/**
 * Per-voice offline renders for level-issue song → compare peak behavior by lane.
 *
 * Usage: yarn level-issue-voices:render
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

import {
  LEVEL_ISSUE_SONG_ID,
  levelissuescenario,
  levelissuevoicerolesummary,
  levelissuevoicescenario,
} from '../zss/feature/synth/backend/daisy/levelissuesong.ts'
import type { LEVEL_STABILITY_METRICS } from '../zss/feature/synth/backend/wasm/levelstabilitymetrics.ts'

import { startparityvite, stopparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const PORT = 9881
const OUTDIR = path.join(PROJECT, 'cafe/public/renders/voice-isolation')
const WINDOWMS = 46

function peakbands(metrics: LEVEL_STABILITY_METRICS) {
  const bands = { hash: 0, eq: 0, dash: 0, dot: 0, space: 0 }
  for (const db of metrics.windowpeaksDb) {
    if (db > -10) {
      bands.hash++
    } else if (db > -20) {
      bands.eq++
    } else if (db > -35) {
      bands.dash++
    } else if (db > -50) {
      bands.dot++
    } else {
      bands.space++
    }
  }
  const n = metrics.windowpeaksDb.length
  const sorted = [...metrics.windowpeaksDb].sort((a, b) => a - b)
  const p10 = sorted[Math.floor(n * 0.1)]
  const p50 = sorted[Math.floor(n * 0.5)]
  const p90 = sorted[Math.floor(n * 0.9)]
  return { bands, n, p10, p50, p90, min: sorted[0], max: sorted[n - 1] }
}

function timelinascii(
  peaksdb: number[],
  durationsec: number,
  cols = 60,
): string {
  const timeline = Array(cols).fill(' ')
  for (let c = 0; c < cols; c++) {
    const t0 = (c / cols) * durationsec
    const t1 = ((c + 1) / cols) * durationsec
    const slice = peaksdb.slice(
      Math.floor((t0 * 1000) / WINDOWMS),
      Math.ceil((t1 * 1000) / WINDOWMS),
    )
    if (slice.length === 0) {
      continue
    }
    const maxp = Math.max(...slice)
    if (maxp > -10) {
      timeline[c] = '#'
    } else if (maxp > -20) {
      timeline[c] = '='
    } else if (maxp > -35) {
      timeline[c] = '-'
    } else if (maxp > -50) {
      timeline[c] = '.'
    }
  }
  return timeline.join('')
}

async function main() {
  fs.mkdirSync(OUTDIR, { recursive: true })

  const roles = levelissuevoicerolesummary()
  console.log('Voice lane roles (lines per play):')
  for (let v = 0; v < 4; v++) {
    console.log(`  voice ${v}:`, roles.roles[v])
  }
  console.log('')

  const scenarios = [
    levelissuescenario(),
    ...([0, 1, 2, 3] as const).map((v) => levelissuevoicescenario(v)),
  ]

  const parity = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch()
  const results: {
    id: string
    overallpeakdb: number
    p10: number
    p50: number
    p90: number
    spread: number
    bands: ReturnType<typeof peakbands>['bands']
    timeline: string
    durationsec: number
  }[] = []

  try {
    const page = await browser.newPage()
    await page.goto(`http://127.0.0.1:${PORT}/level-stability.html`, {
      waitUntil: 'domcontentloaded',
    })

    for (const scenario of scenarios) {
      console.log(`Rendering ${scenario.id}…`)
      const payload = await page.evaluate(
        async ({ scenarioid, windowms }) => {
          const { renderdaisylevelscenario } =
            await import('/zss/feature/synth/backend/daisy/daisylevelrender.ts')
          const { levelissuescenario, levelissuevoicescenario } =
            await import('/zss/feature/synth/backend/daisy/levelissuesong.ts')
          const { analyzelevelstability } =
            await import('/zss/feature/synth/backend/wasm/levelstabilitymetrics.ts')

          let scenario
          if (scenarioid === 'level-issue-song') {
            scenario = levelissuescenario()
          } else {
            const v = Number(scenarioid.replace('level-issue-song-voice-', ''))
            scenario = levelissuevoicescenario(v)
          }
          const render = await renderdaisylevelscenario(scenario)
          const metrics = analyzelevelstability(
            render.samples,
            render.samplerate,
            windowms,
          )
          return {
            id: scenario.id,
            rendersec: render.rendersec,
            metrics,
          }
        },
        { scenarioid: scenario.id, windowms: WINDOWMS },
      )

      const metrics = payload.metrics as LEVEL_STABILITY_METRICS
      const bands = peakbands(metrics)
      const timeline = timelinascii(metrics.windowpeaksDb, payload.rendersec)

      results.push({
        id: payload.id,
        overallpeakdb: metrics.overallpeakdb,
        p10: bands.p10,
        p50: bands.p50,
        p90: bands.p90,
        spread: bands.p90 - bands.p10,
        bands: bands.bands,
        timeline,
        durationsec: payload.rendersec,
      })

      console.log(
        `  peak ${metrics.overallpeakdb.toFixed(1)} dBFS  p10..p90 ${bands.p10.toFixed(1)}..${bands.p90.toFixed(1)}  spread ${(bands.p90 - bands.p10).toFixed(1)} dB`,
      )
    }
  } finally {
    await browser.close()
    await stopparityvite(parity)
  }

  const lines = [
    'Level-issue song — per-voice isolation',
    '',
    'Voice lane roles (non-empty lines):',
    ...([0, 1, 2, 3] as const).map((v) => {
      const r = roles.roles[v]
      const active = r.melody + r.drums + r.mixed
      return `  v${v}: melody=${r.melody} drums=${r.drums} mixed=${r.mixed} empty=${r.empty}  (${active} active)`
    }),
    '',
    'Peak timeline (# >-10  = >-20  - >-35  . >-50):',
    '',
  ]

  for (const row of results) {
    const pcteq = (
      (100 * row.bands.eq) /
      (row.bands.eq +
        row.bands.dash +
        row.bands.dot +
        row.bands.hash +
        row.bands.space)
    ).toFixed(0)
    lines.push(
      `${row.id.padEnd(28)} pk ${row.overallpeakdb.toFixed(1).padStart(6)}  spread ${row.spread.toFixed(1).padStart(5)}  = ${pcteq}%`,
    )
    lines.push(`  ${row.timeline}`)
    lines.push('')
  }

  const report = lines.join('\n')
  fs.writeFileSync(path.join(OUTDIR, 'report.txt'), report)
  fs.writeFileSync(
    path.join(OUTDIR, 'report.json'),
    JSON.stringify({ roles, results }, null, 2),
  )
  console.log('')
  console.log(report)
  console.log(`Report: ${OUTDIR}/report.txt`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
