import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import {
  startparityvite,
  stopparityvite,
} from 'tasks/lib/parity/parity-vite-server.ts'

import type { LEVEL_STABILITY_METRICS } from '../zss/feature/synth/backend/wasm/levelstabilitymetrics.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const OUT = path.join(
  PROJECT,
  'ops/fixtures/synth/wasm/adsrenvcurve-tone-metrics.json',
)
const PORT = 9885

async function main() {
  const parity = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    page.on('pageerror', (err) => {
      console.error('pageerror:', err.message)
    })
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('browser:', msg.text())
      }
    })
    page.setDefaultTimeout(120_000)
    await page.goto(`http://127.0.0.1:${PORT}/adsrenvcurve-regen.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    })
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
      { timeout: 120_000 },
    )
    const body = await page.locator('#out').textContent()
    if (!body || body.startsWith('error') || body.startsWith('rendering')) {
      throw new Error(`adsrenvcurve regen failed: ${body}`)
    }
    const parsed = JSON.parse(body) as {
      tone: LEVEL_STABILITY_METRICS
      sustain: { peakdb: number; rmsdb: number }
    }
    writeFileSync(OUT, `${JSON.stringify(parsed, null, 2)}\n`)
    console.log(`wrote ${OUT}`)
  } finally {
    await browser.close()
    await stopparityvite(parity)
  }
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
