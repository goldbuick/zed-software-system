/**
 * FX bus wet-lift report via Playwright offline render (needs OfflineAudioContext).
 *
 *   yarn test:fx-bus-metrics
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

import {
  computefxbusmetrics,
  formatfxbusmetricsline,
  isfxbussoloscenario,
} from '../zss/feature/synth/backend/daisy/fxbusmetrics'
import { FX_MATRIX_COMPARE_BASELINE } from '../zss/feature/synth/backend/daisy/fxlevelscenarios'
import { filterlevelstabilityscenarios } from '../zss/feature/synth/backend/daisy/levelstabilityscenarios'
import type { LEVEL_STABILITY_METRICS } from '../zss/feature/synth/backend/wasm/levelstabilitymetrics'

import { startparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const PORT = 9878

type PAYLOAD = { metrics: Record<string, LEVEL_STABILITY_METRICS> }

async function renderscenario(
  page: import('@playwright/test').Page,
  scenarioid: string,
): Promise<LEVEL_STABILITY_METRICS> {
  const url = `http://127.0.0.1:${PORT}/level-stability.html?scenario=${scenarioid}`
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
    throw new Error(`empty response for ${scenarioid}`)
  }
  const parsed = JSON.parse(body) as PAYLOAD
  const metrics = parsed.metrics[scenarioid]
  if (!metrics) {
    throw new Error(`missing metrics for ${scenarioid}`)
  }
  return metrics
}

async function main() {
  const scenarios = filterlevelstabilityscenarios('fxmatrix')
  const { server, vite } = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch()
  const metrics: Record<string, LEVEL_STABILITY_METRICS> = {}
  try {
    const page = await browser.newPage()
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
