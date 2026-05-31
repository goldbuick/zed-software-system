/**
 * Offline Daisy level-stability harness (Playwright + Vite, mirrors parity regen).
 *
 * Usage:
 *   yarn test:level-stability
 *   yarn test:level-stability --strict
 *   yarn test:level-stability --filter scalecrew
 *   yarn test:level-stability --scenario scalecrew-climax-full
 *   yarn test:level-stability --compare scalecrew-climax-melody scalecrew-climax-full
 *   yarn test:level-stability --filter scalecrew --strict-scalecrew
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

import {
  comparelevelstability,
  diagnoselevelstability,
  formatlevelstabilityline,
  formatwindowcompareplot,
  type LEVEL_STABILITY_METRICS,
} from '../zss/feature/synth/backend/wasm/levelstabilitymetrics.ts'
import {
  formatcompressormeterline,
  formatmixbalanceline,
  mixmelodybalanceDb,
  type COMPRESSOR_METER_STATS,
} from '../zss/feature/synth/backend/wasm/compressormetrics.ts'
import {
  LEVEL_STABILITY_COMPARE_PAIRS,
  LEVEL_STABILITY_MIX_BALANCE_PAIRS,
  LEVEL_STABILITY_MIN_FX_PEAKRANGE_INCREASE_DB,
  LEVEL_STABILITY_MIN_REVERB_RMSRANGE_INCREASE_DB,
  LEVEL_STABILITY_SCENARIOS,
  SCALE_CREW_DUCK_MIN_DB,
  SCALE_CREW_MAX_COMP_GR_RANGE_DB,
  SCALE_CREW_MAX_OUTPUT_PEAK_DB,
  SCALE_CREW_MAX_MIX_RMS_DELTA_DB,
  SCALE_CREW_MAX_OVERALL_PEAK_GAP_DB,
  SCALE_CREW_MAX_STEADY_PEAK_DELTA_DB,
  SCALE_CREW_MIN_COMP_GR_RANGE_DB,
  filterlevelstabilityscenarios,
} from '../zss/feature/synth/backend/daisy/levelstabilityscenarios.ts'

import { startparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const LEVEL_STABILITY_PORT = 9878

type SCENARIO_PAYLOAD = {
  metrics: Record<string, LEVEL_STABILITY_METRICS>
  compressormetrics: Record<string, COMPRESSOR_METER_STATS | undefined>
}

function parseargs() {
  const strict = process.argv.includes('--strict')
  const strictscalecrew = process.argv.includes('--strict-scalecrew')
  const scenidx = process.argv.indexOf('--scenario')
  const filteridx = process.argv.indexOf('--filter')
  const compareidx = process.argv.indexOf('--compare')
  const scenarioid =
    scenidx >= 0 && process.argv[scenidx + 1] ? process.argv[scenidx + 1] : 'all'
  const filter =
    filteridx >= 0 && process.argv[filteridx + 1]
      ? process.argv[filteridx + 1]
      : scenarioid === 'all'
        ? 'all'
        : scenarioid
  const comparea =
    compareidx >= 0 && process.argv[compareidx + 1]
      ? process.argv[compareidx + 1]
      : undefined
  const compareb =
    compareidx >= 0 && process.argv[compareidx + 2]
      ? process.argv[compareidx + 2]
      : undefined
  return { strict, strictscalecrew, scenarioid, filter, comparea, compareb }
}

function formatreport(
  metrics: Record<string, LEVEL_STABILITY_METRICS>,
  compressormetrics: Record<string, COMPRESSOR_METER_STATS | undefined>,
  scenarios = LEVEL_STABILITY_SCENARIOS,
): string {
  const lines: string[] = [
    'Daisy offline level stability (46 ms windows, steady = middle 50% of active)',
    'scenario                     spkΔ            srmsΔ           spkσ             pk             steady',
    '-'.repeat(96),
  ]
  for (const scenario of scenarios) {
    const m = metrics[scenario.id]
    if (m) {
      lines.push(formatlevelstabilityline(scenario.id, m))
    }
  }
  lines.push('', 'Master compressor meters (~1 Hz during render):')
  for (const scenario of scenarios) {
    if (scenario.compressormeters) {
      lines.push(formatcompressormeterline(scenario.id, compressormetrics[scenario.id]))
    }
  }
  lines.push('', 'Comparisons (candidate vs baseline):')
  for (const line of diagnoselevelstability(metrics, LEVEL_STABILITY_COMPARE_PAIRS)) {
    lines.push(`  ${line}`)
  }
  lines.push('', 'Mix balance (full vs melody-only overall rms):')
  for (const [melodyid, fullid] of LEVEL_STABILITY_MIX_BALANCE_PAIRS) {
    const melody = metrics[melodyid]
    const full = metrics[fullid]
    if (melody && full) {
      lines.push(
        `  ${formatmixbalanceline(fullid, melodyid, full.overallrmsdb, melody.overallrmsdb)}`,
      )
    }
  }
  return lines.join('\n')
}

async function renderscenario(
  page: import('@playwright/test').Page,
  scenarioid: string,
): Promise<SCENARIO_PAYLOAD> {
  const params = new URLSearchParams({ scenario: scenarioid })
  const url = `http://127.0.0.1:${LEVEL_STABILITY_PORT}/level-stability.html?${params.toString()}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 600000 })
  await page.waitForFunction(
    () => {
      const el = document.getElementById('out')
      return (
        el &&
        el.textContent &&
        !el.textContent.startsWith('rendering') &&
        !el.textContent.startsWith('error')
      )
    },
    { timeout: 600000 },
  )
  const body = await page.locator('#out').textContent()
  if (!body) {
    throw new Error(`empty level stability response for ${scenarioid}`)
  }
  const parsed = JSON.parse(body) as SCENARIO_PAYLOAD
  const metrics = parsed.metrics[scenarioid]
  if (!metrics) {
    throw new Error(`missing metrics for ${scenarioid}`)
  }
  if (metrics.overallpeakdb < -40) {
    throw new Error(
      `${scenarioid} output too quiet (${metrics.overallpeakdb.toFixed(1)} dB peak); render may have failed`,
    )
  }
  return parsed
}

async function renderall(filter: string): Promise<SCENARIO_PAYLOAD> {
  const { server, vite } = await startparityvite(PROJECT, LEVEL_STABILITY_PORT)
  const browser = await chromium.launch()
  const metrics: Record<string, LEVEL_STABILITY_METRICS> = {}
  const compressormetrics: Record<string, COMPRESSOR_METER_STATS | undefined> =
    {}
  try {
    const page = await browser.newPage()
    const scenarios = filterlevelstabilityscenarios(filter)
    if (scenarios.length === 0) {
      throw new Error(`unknown filter/scenario ${filter}`)
    }
    for (const scenario of scenarios) {
      const payload = await renderscenario(page, scenario.id)
      metrics[scenario.id] = payload.metrics[scenario.id]
      compressormetrics[scenario.id] = payload.compressormetrics?.[scenario.id]
    }
    return { metrics, compressormetrics }
  } finally {
    await browser.close()
    await new Promise<void>((resolve) => server.close(resolve))
    await vite.close()
  }
}

async function rendercompare(
  ida: string,
  idb: string,
): Promise<{ a: LEVEL_STABILITY_METRICS; b: LEVEL_STABILITY_METRICS }> {
  const payload = await renderall(ida)
  const pagepayload = await (async () => {
    const { server, vite } = await startparityvite(PROJECT, LEVEL_STABILITY_PORT)
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      await renderscenario(page, ida)
      const second = await renderscenario(page, idb)
      return second
    } finally {
      await browser.close()
      await new Promise<void>((resolve) => server.close(resolve))
      await vite.close()
    }
  })()
  const ma = payload.metrics[ida] ?? pagepayload.metrics[ida]
  const mb = pagepayload.metrics[idb]
  if (!ma || !mb) {
    throw new Error(`compare failed for ${ida} vs ${idb}`)
  }
  return { a: ma, b: mb }
}

function assertevidence(
  metrics: Record<string, LEVEL_STABILITY_METRICS>,
): string[] {
  const failures: string[] = []
  for (const [baseid, candid] of LEVEL_STABILITY_COMPARE_PAIRS) {
    const base = metrics[baseid]
    const cand = metrics[candid]
    if (!base || !cand) {
      continue
    }
    const delta = comparelevelstability(base, cand)
    if (
      candid.includes('reverb') &&
      delta.steadyrmsrangeDeltaDb < LEVEL_STABILITY_MIN_REVERB_RMSRANGE_INCREASE_DB
    ) {
      failures.push(
        `${candid} vs ${baseid}: steady rms +${delta.steadyrmsrangeDeltaDb.toFixed(1)} dB (expected >= ${LEVEL_STABILITY_MIN_REVERB_RMSRANGE_INCREASE_DB} dB)`,
      )
    }
    if (
      (candid.includes('fxstack') || candid.includes('reverb')) &&
      delta.steadypeakrangeDeltaDb < LEVEL_STABILITY_MIN_FX_PEAKRANGE_INCREASE_DB
    ) {
      failures.push(
        `${candid} vs ${baseid}: steady peak +${delta.steadypeakrangeDeltaDb.toFixed(1)} dB (expected >= ${LEVEL_STABILITY_MIN_FX_PEAKRANGE_INCREASE_DB} dB)`,
      )
    }
  }
  return failures
}

function assertscalecrew(
  metrics: Record<string, LEVEL_STABILITY_METRICS>,
  compressormetrics: Record<string, COMPRESSOR_METER_STATS | undefined>,
): string[] {
  const failures: string[] = []
  const melody = metrics['scalecrew-climax-melody']
  const full = metrics['scalecrew-climax-full']
  if (melody && full) {
    const delta = comparelevelstability(melody, full)
    if (delta.steadypeakrangeDeltaDb > SCALE_CREW_MAX_STEADY_PEAK_DELTA_DB) {
      failures.push(
        `climax drums add +${delta.steadypeakrangeDeltaDb.toFixed(1)} dB steady peak swing (max ${SCALE_CREW_MAX_STEADY_PEAK_DELTA_DB} dB)`,
      )
    }
    const peakgap = full.overallpeakdb - melody.overallpeakdb
    if (peakgap > SCALE_CREW_MAX_OVERALL_PEAK_GAP_DB) {
      failures.push(
        `climax full mix ${peakgap.toFixed(1)} dB louder peak than melody (max ${SCALE_CREW_MAX_OVERALL_PEAK_GAP_DB} dB)`,
      )
    }
    const rmsdelta = mixmelodybalanceDb(full, melody)
    if (rmsdelta > SCALE_CREW_MAX_MIX_RMS_DELTA_DB) {
      failures.push(
        `climax drums add +${rmsdelta.toFixed(1)} dB mix rms over melody (max ${SCALE_CREW_MAX_MIX_RMS_DELTA_DB} dB)`,
      )
    }
  }

  for (const id of ['scalecrew-climax-full', 'scalecrew-full-song'] as const) {
    const comp = compressormetrics[id]
    if (!comp) {
      continue
    }
    if (comp.compgrrangeDb < SCALE_CREW_MIN_COMP_GR_RANGE_DB) {
      failures.push(
        `${id}: comp grΔ ${comp.compgrrangeDb.toFixed(1)} dB (min ${SCALE_CREW_MIN_COMP_GR_RANGE_DB} dB)`,
      )
    }
    if (comp.compgrrangeDb > SCALE_CREW_MAX_COMP_GR_RANGE_DB) {
      failures.push(
        `${id}: comp grΔ ${comp.compgrrangeDb.toFixed(1)} dB (max ${SCALE_CREW_MAX_COMP_GR_RANGE_DB} dB)`,
      )
    }
    if (comp.duckmax < SCALE_CREW_DUCK_MIN_DB) {
      failures.push(
        `${id}: duck max ${comp.duckmax.toFixed(1)} (min ${SCALE_CREW_DUCK_MIN_DB})`,
      )
    }
  }

  for (const id of [
    'scalecrew-climax-full',
    'scalecrew-full-song',
    'scalecrew-climax-melody',
    'scalecrew-full-song-melody',
  ] as const) {
    const output = metrics[id]
    if (!output) {
      continue
    }
    if (output.overallpeakdb > SCALE_CREW_MAX_OUTPUT_PEAK_DB) {
      failures.push(
        `${id}: output peak ${output.overallpeakdb.toFixed(1)} dB (max ${SCALE_CREW_MAX_OUTPUT_PEAK_DB} dB)`,
      )
    }
  }

  return failures
}

async function main() {
  const { strict, strictscalecrew, scenarioid, filter, comparea, compareb } =
    parseargs()

  if (comparea && compareb) {
    console.log(`Comparing ${comparea} vs ${compareb}…`)
    const { server, vite } = await startparityvite(PROJECT, LEVEL_STABILITY_PORT)
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      const first = await renderscenario(page, comparea)
      const second = await renderscenario(page, compareb)
      const ma = first.metrics[comparea]
      const mb = second.metrics[compareb]
      if (!ma || !mb) {
        throw new Error('compare render missing metrics')
      }
      console.log('')
      console.log(formatwindowcompareplot(comparea, compareb, ma, mb))
      console.log('')
      const delta = comparelevelstability(ma, mb)
      console.log(
        `Summary: steady peak ${delta.steadypeakrangeDeltaDb >= 0 ? '+' : ''}${delta.steadypeakrangeDeltaDb.toFixed(1)} dB, steady rms ${delta.steadyrmsrangeDeltaDb >= 0 ? '+' : ''}${delta.steadyrmsrangeDeltaDb.toFixed(1)} dB, overall peak ${(mb.overallpeakdb - ma.overallpeakdb).toFixed(1)} dB`,
      )
    } finally {
      await browser.close()
      await new Promise<void>((resolve) => server.close(resolve))
      await vite.close()
    }
    return
  }

  const runfilter = scenarioid !== 'all' ? scenarioid : filter
  console.log(`Rendering Daisy level stability (${runfilter})…`)
  const payload = await renderall(runfilter)
  const scenarios = filterlevelstabilityscenarios(runfilter)
  console.log('')
  console.log(formatreport(payload.metrics, payload.compressormetrics, scenarios))
  console.log('')
  console.log('Interpretation:')
  console.log(
    '  steady spkΔ/srmsΔ — windowed output swing after attack/release trim.',
  )
  console.log(
    '  comp grΔ / drypk range — master compressor on full mix (play+duck+bg+tts+drums).',
  )
  console.log(
    '  mix rms vs melody-only — positive dB means drums/FX bus adds energy beyond voices alone.',
  )

  const scalecrewfailures =
    runfilter === 'scalecrew' || runfilter.startsWith('scalecrew-')
      ? assertscalecrew(payload.metrics, payload.compressormetrics)
      : []

  if (strictscalecrew && scalecrewfailures.length > 0) {
    console.log('')
    console.log('SCALE CREW GATE FAILURES:')
    for (const line of scalecrewfailures) {
      console.log(`  - ${line}`)
    }
    process.exit(1)
  } else if (scalecrewfailures.length > 0) {
    console.log('')
    console.log('SCALE CREW gates not met (informational):')
    for (const line of scalecrewfailures) {
      console.log(`  - ${line}`)
    }
  } else if (strictscalecrew) {
    console.log('')
    console.log('SCALE CREW gates passed.')
  }

  if (runfilter === 'all' || runfilter === 'simple') {
    const failures = assertevidence(payload.metrics)
    if (failures.length > 0) {
      console.log('')
      console.log(
        strict ? 'ASSERTION FAILURES:' : 'Simple-scenario thresholds not met (informational):',
      )
      for (const line of failures) {
        console.log(`  - ${line}`)
      }
      if (strict) {
        process.exit(1)
      }
    } else if (strict) {
      console.log('')
      console.log('Strict evidence thresholds passed.')
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
