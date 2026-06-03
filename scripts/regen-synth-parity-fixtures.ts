import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

import {
  DRUM_PARITY_PATCHES,
  ENVELOPE_ADSR_PARITY_PATCHES,
  FX_PARITY_PATCHES,
  MAIN_DYNAMICS_PARITY_PATCHES,
  WASM_PARITY_PATCHES,
} from '../zss/feature/synth/backend/wasm/paritypatches.ts'
import type { PARITY_AUDIO_METRICS } from '../zss/feature/synth/backend/wasm/paritymetrics.ts'

import { startparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const USE_TONE = process.argv.includes('--tone')
const OUT = path.join(
  PROJECT,
  'zss/feature/synth/backend/wasm/__fixtures__',
  USE_TONE ? 'parity-metrics-tone.json' : 'parity-metrics.json',
)
const REGEN_PORT = USE_TONE ? 9877 : 9876

function metricsusable(metrics: PARITY_AUDIO_METRICS): boolean {
  return metrics.rmsdb > -119
}

function loadexisting(): Record<string, PARITY_AUDIO_METRICS> {
  try {
    const raw = readFileSync(OUT, 'utf8')
    const parsed = JSON.parse(raw) as {
      patches: Record<string, PARITY_AUDIO_METRICS>
    }
    return parsed.patches ?? {}
  } catch {
    return {}
  }
}

async function renderpatchmetrics(
  page: import('@playwright/test').Page,
  patchid: string,
  kind: 'voice' | 'drum' | 'fx' | 'main',
): Promise<PARITY_AUDIO_METRICS> {
  const params = new URLSearchParams({
    patch: patchid,
    kind,
  })
  if (USE_TONE) {
    params.set('backend', 'tone')
  }
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

async function renderallpatches(): Promise<Record<string, PARITY_AUDIO_METRICS>> {
  const { server, vite } = await startparityvite(PROJECT, REGEN_PORT)
  const browser = await chromium.launch()
  const out: Record<string, PARITY_AUDIO_METRICS> = {}
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
    for (const patch of WASM_PARITY_PATCHES) {
      out[patch.id] = await renderpatchmetrics(page, patch.id, 'voice')
    }
    for (const patch of ENVELOPE_ADSR_PARITY_PATCHES) {
      out[patch.id] = await renderpatchmetrics(page, patch.id, 'voice')
    }
    for (const patch of DRUM_PARITY_PATCHES) {
      out[patch.id] = await renderpatchmetrics(page, patch.id, 'drum')
    }
    for (const patch of FX_PARITY_PATCHES) {
      out[patch.id] = await renderpatchmetrics(page, patch.id, 'fx')
    }
    for (const patch of MAIN_DYNAMICS_PARITY_PATCHES) {
      out[patch.id] = await renderpatchmetrics(page, patch.id, 'main')
    }
    return out
  } finally {
    await browser.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await vite.close()
  }
}

async function main() {
  const existing = loadexisting()
  const patches: Record<string, PARITY_AUDIO_METRICS> = { ...existing }
  const rendered = await renderallpatches()
  const allids = [
    ...WASM_PARITY_PATCHES.map((p) => p.id),
    ...ENVELOPE_ADSR_PARITY_PATCHES.map((p) => p.id),
    ...DRUM_PARITY_PATCHES.map((p) => p.id),
    ...FX_PARITY_PATCHES.map((p) => p.id),
    ...MAIN_DYNAMICS_PARITY_PATCHES.map((p) => p.id),
  ]
  for (const patchid of allids) {
    const metrics = rendered[patchid]
    if (!metrics) {
      console.warn(`skip ${patchid} — render missing`)
      continue
    }
    if (!metricsusable(metrics)) {
      if (existing[patchid]) {
        console.warn(`keep ${patchid} — render silent`)
        continue
      }
      console.warn(`skip ${patchid} — render silent and no existing fixture`)
      continue
    }
    patches[patchid] = metrics
    console.log(`${USE_TONE ? 'tone' : 'wasm'} ${patchid}`, metrics)
  }
  if (Object.keys(patches).length === 0) {
    console.error('No patches rendered — ensure playwright chromium is installed.')
    process.exit(1)
  }
  writeFileSync(OUT, `${JSON.stringify({ patches }, null, 2)}\n`)
  console.log(`wrote ${OUT}`)
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
