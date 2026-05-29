import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

import { DRUM_PARITY_PATCHES } from '../zss/feature/synth/backend/wasm/paritypatches.ts'
import type { PARITY_AUDIO_METRICS } from '../zss/feature/synth/backend/wasm/paritymetrics.ts'

import { startparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const OUT = path.join(
  PROJECT,
  'zss/feature/synth/backend/wasm/__fixtures__/parity-metrics-daisy.json',
)
const REGEN_PORT = 9878

function metricsusable(metrics: PARITY_AUDIO_METRICS): boolean {
  return metrics.rmsdb > -119
}

async function renderdrummetrics(
  page: import('@playwright/test').Page,
  patchid: string,
): Promise<PARITY_AUDIO_METRICS> {
  const params = new URLSearchParams({
    patch: patchid,
    kind: 'drum',
    backend: 'daisy',
  })
  const url = `http://127.0.0.1:${REGEN_PORT}/parity-regen.html?${params.toString()}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 })
  await page.waitForFunction(
    () => {
      const el = document.getElementById('out')
      return el && el.textContent && !el.textContent.startsWith('rendering')
    },
    { timeout: 180000 },
  )
  const body = await page.locator('#out').textContent()
  if (!body) {
    throw new Error(`empty parity regen response for ${patchid}`)
  }
  const parsed = JSON.parse(body) as Record<string, PARITY_AUDIO_METRICS>
  const metrics = parsed[patchid]
  if (!metrics) {
    throw new Error(`missing metrics for ${patchid}`)
  }
  return metrics
}

async function main() {
  let existing: Record<string, PARITY_AUDIO_METRICS> = {}
  try {
    const raw = readFileSync(OUT, 'utf8')
    existing =
      (JSON.parse(raw) as { patches: Record<string, PARITY_AUDIO_METRICS> })
        .patches ?? {}
  } catch {
    existing = {}
  }

  const { server, vite } = await startparityvite(PROJECT, REGEN_PORT)
  const browser = await chromium.launch()
  const patches: Record<string, PARITY_AUDIO_METRICS> = { ...existing }
  try {
    const page = await browser.newPage()
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`browser [${msg.text()}]`)
      }
    })
    page.on('pageerror', (err) => {
      console.error('pageerror:', err.message)
    })
    for (const patch of DRUM_PARITY_PATCHES) {
      const metrics = await renderdrummetrics(page, patch.id)
      if (!metricsusable(metrics)) {
        console.warn(`skip ${patch.id} — render silent`)
        continue
      }
      patches[patch.id] = metrics
      console.log(`daisy ${patch.id}`, metrics)
    }
  } finally {
    await browser.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await vite.close()
  }

  if (Object.keys(patches).length === 0) {
    console.error('No drum patches rendered.')
    process.exit(1)
  }
  writeFileSync(OUT, `${JSON.stringify({ patches }, null, 2)}\n`)
  console.log(`wrote ${OUT}`)
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
