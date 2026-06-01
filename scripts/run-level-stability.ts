/**
 * Offline Daisy level-stability harness (Playwright + Vite, mirrors parity regen).
 *
 * Usage:
 *   yarn test:level-stability
 *   yarn test:level-stability --strict
 *   yarn test:level-stability --filter scalecrew
 *   yarn test:level-stability --scenario scalecrew-climax-full
 *   yarn test:level-stability --compare scalecrew-climax-melody scalecrew-climax-full
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
import { formatmixbalanceline } from '../zss/feature/synth/backend/wasm/compressormetrics.ts'
import {
  LEVEL_STABILITY_COMPARE_PAIRS,
  LEVEL_STABILITY_MIX_BALANCE_PAIRS,
  LEVEL_STABILITY_MIN_FX_PEAKRANGE_INCREASE_DB,
  LEVEL_STABILITY_MIN_REVERB_RMSRANGE_INCREASE_DB,
  LEVEL_STABILITY_SCENARIOS,
  filterlevelstabilityscenarios,
} from '../zss/feature/synth/backend/daisy/levelstabilityscenarios.ts'

import { startparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const LEVEL_STABILITY_PORT = 9878

type SCENARIO_PAYLOAD = {
  metrics: Record<string, LEVEL_STABILITY_METRICS>
}

function parseargs() {
  const strict = process.argv.includes('--strict')
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
  return { strict, scenarioid, filter, comparea, compareb }
}

function formatreport(
  metrics: Record<string, LEVEL_STABILITY_METRICS>,
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
  try {
    const page = await browser.newPage()
    const scenarios = filterlevelstabilityscenarios(filter)
    if (scenarios.length === 0) {
      throw new Error(`unknown filter/scenario ${filter}`)
    }
    for (const scenario of scenarios) {
      const payload = await renderscenario(page, scenario.id)
      metrics[scenario.id] = payload.metrics[scenario.id]
    }
    return { metrics }
  } finally {
    await browser.close()
    await new Promise<void>((resolve) => server.close(resolve))
    await vite.close()
  }
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

async function main() {
  const { strict, scenarioid, filter, comparea, compareb } = parseargs()

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
  console.log(formatreport(payload.metrics, scenarios))
  console.log('')
  console.log('Interpretation:')
  console.log(
    '  steady spkΔ/srmsΔ — windowed output swing after attack/release trim.',
  )
  console.log(
    '  mix rms vs melody-only — positive dB means drums/FX bus adds energy beyond voices alone.',
  )

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
