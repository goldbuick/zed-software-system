/**
 * Regen Tone metrics for env-adsr-sustain / env-adsr-retrigger only.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

import type { PARITY_AUDIO_METRICS } from '../zss/feature/synth/backend/wasm/paritymetrics.ts'
import { ENVELOPE_ADSR_PARITY_PATCHES } from '../zss/feature/synth/backend/wasm/paritypatches.ts'

import { startparityvite, stopparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const OUT = path.join(
  PROJECT,
  'zss/feature/synth/backend/wasm/__fixtures__/parity-metrics-tone.json',
)
const PORT = 9878

async function renderpatchmetrics(
  page: import('@playwright/test').Page,
  patchid: string,
): Promise<PARITY_AUDIO_METRICS> {
  const params = new URLSearchParams({
    patch: patchid,
    kind: 'voice',
    backend: 'tone',
  })
  const url = `http://127.0.0.1:${PORT}/parity-regen.html?${params.toString()}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 })
  await page.waitForFunction(
    () => {
      const el = document.getElementById('out')
      return el && el.textContent && !el.textContent.startsWith('rendering')
    },
    { timeout: 180000 },
  )
  const body = await page.locator('#out').textContent()
  if (!body || body.startsWith('error')) {
    throw new Error(`parity regen failed for ${patchid}: ${body}`)
  }
  const parsed = JSON.parse(body) as Record<string, PARITY_AUDIO_METRICS>
  const metrics = parsed[patchid]
  if (!metrics) {
    throw new Error(`missing metrics for ${patchid}`)
  }
  return metrics
}

async function main() {
  const raw = readFileSync(OUT, 'utf8')
  const file = JSON.parse(raw) as {
    patches: Record<string, PARITY_AUDIO_METRICS>
  }
  const parity = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(180_000)
    page.on('pageerror', (err) => console.error('pageerror:', err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('browser:', msg.text())
      }
    })
    for (const patch of ENVELOPE_ADSR_PARITY_PATCHES) {
      console.log(`tone ${patch.id}…`)
      file.patches[patch.id] = await renderpatchmetrics(page, patch.id)
    }
    writeFileSync(OUT, `${JSON.stringify(file, null, 2)}\n`)
    console.log(`updated ${OUT}`)
  } finally {
    await browser.close()
    await stopparityvite(parity)
  }
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
