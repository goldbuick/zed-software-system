/**
 * FX bus wet-lift report via Playwright offline render (needs OfflineAudioContext).
 *
 *   yarn fx-bus-metrics:test
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  launchparitybrowser,
  parityhosturl,
} from 'tasks/lib/parity/parity-playwright.ts'
import { startparityvite } from 'tasks/lib/parity/parity-vite-server.ts'

import {
  computefxbusmetrics,
  formatfxbusmetricsline,
  isfxbussoloscenario,
} from '../zss/feature/synth/backend/daisy/fxbusmetrics'
import { FX_MATRIX_COMPARE_BASELINE } from '../zss/feature/synth/backend/daisy/fxlevelscenarios'
import { filterlevelstabilityscenarios } from '../zss/feature/synth/backend/daisy/levelstabilityscenarios'
import type { LEVEL_STABILITY_METRICS } from '../zss/feature/synth/backend/wasm/levelstabilitymetrics'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const PORT = 9878

async function renderscenario(
  page: import('@playwright/test').Page,
  scenarioid: string,
): Promise<LEVEL_STABILITY_METRICS> {
  const parsed = await page.evaluate(
    async (args) => {
      const { runlevelstabilitybrowser } =
        await import('/ops/lib/daisy-parity/level-stability-runner.ts')
      return runlevelstabilitybrowser(args)
    },
    { scenarioid },
  )
  const metrics = parsed.metrics[scenarioid]
  if (!metrics) {
    throw new Error(`missing metrics for ${scenarioid}`)
  }
  return metrics
}

async function main() {
  const scenarios = filterlevelstabilityscenarios('fxmatrix')
  const { server, vite } = await startparityvite(PROJECT, PORT)
  const browser = await launchparitybrowser()
  const metrics: Record<string, LEVEL_STABILITY_METRICS> = {}
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(600_000)
    await page.goto(parityhosturl(PORT), {
      waitUntil: 'domcontentloaded',
      timeout: 600000,
    })
    for (const scenario of scenarios) {
      console.warn(`Rendering ${scenario.id}…`)
      metrics[scenario.id] = await renderscenario(page, scenario.id)
    }
  } finally {
    await browser.close()
    await new Promise<void>((resolve) => server.close(resolve))
    await vite.close()
  }

  const base = metrics[FX_MATRIX_COMPARE_BASELINE]
  if (!base) {
    throw new Error(`missing ${FX_MATRIX_COMPARE_BASELINE}`)
  }

  console.log('')
  console.log('FX bus metrics (orthogonal wet estimate vs fxmatrix-dry):')
  for (const id of Object.keys(metrics).sort()) {
    if (!isfxbussoloscenario(id)) {
      continue
    }
    const cand = metrics[id]
    if (cand) {
      console.log(formatfxbusmetricsline(computefxbusmetrics(id, cand, base)))
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
