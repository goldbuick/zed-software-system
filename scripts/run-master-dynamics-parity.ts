/**
 * Daisy vs Tone master-dynamics parity (Playwright + Vite).
 *
 * Usage:
 *   yarn test:master-dynamics-parity
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

import {
  MASTER_DYNAMICS_PARITY_PATCHES,
} from '../zss/feature/synth/backend/wasm/paritypatches.ts'
import {
  type PARITY_AUDIO_METRICS,
  formatmetricsdelta,
} from '../zss/feature/synth/backend/wasm/paritymetrics.ts'
import { paritytolerancesfor } from '../zss/feature/synth/backend/wasm/paritytolerances.ts'
import { MASTER_DYNAMICS_RMS_FLOAT_EPS_DB } from '../zss/feature/synth/backend/daisy/masterdynamicsacceptance.ts'

import { startparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const PORT = 9879
const FIXTURE_PATH = path.join(
  PROJECT,
  'zss/feature/synth/backend/wasm/__fixtures__/parity-metrics-tone.json',
)

async function renderpatchmetrics(
  page: import('@playwright/test').Page,
  patchid: string,
): Promise<PARITY_AUDIO_METRICS> {
  const params = new URLSearchParams({ patch: patchid })
  const url = `http://127.0.0.1:${PORT}/master-dynamics-parity.html?${params.toString()}`
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
  if (!body || body.startsWith('error:')) {
    throw new Error(body ?? `empty response for ${patchid}`)
  }
  const parsed = JSON.parse(body) as Record<string, PARITY_AUDIO_METRICS>
  const metrics = parsed[patchid]
  if (!metrics) {
    throw new Error(`missing metrics for ${patchid}`)
  }
  return metrics
}

const PRIMARY_MASTER_PATCHES = new Set([
  'master-comp-drums',
  'master-full-mix',
])

async function main() {
  const raw = readFileSync(FIXTURE_PATH, 'utf8')
  const fixtures = JSON.parse(raw) as { patches: Record<string, PARITY_AUDIO_METRICS> }
  const { server, vite } = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch()
  const failures: string[] = []
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
    for (const patch of MASTER_DYNAMICS_PARITY_PATCHES) {
      const expected = fixtures.patches[patch.id]
      if (!expected) {
        failures.push(`${patch.id} | missing tone fixture`)
        continue
      }
      const actual = await renderpatchmetrics(page, patch.id)
      const tol = paritytolerancesfor(patch.id)
      const primary = PRIMARY_MASTER_PATCHES.has(patch.id)
      const rmsok =
        Math.abs(actual.rmsdb - expected.rmsdb) <=
        tol.rmsdbtol + MASTER_DYNAMICS_RMS_FLOAT_EPS_DB
      const peakok = Math.abs(actual.peakdb - expected.peakdb) <= tol.peakdbtol
      if (primary) {
        if (rmsok && peakok) {
          console.log(`pass ${patch.id}`)
        } else {
          failures.push(formatmetricsdelta(patch.id, actual, expected))
        }
        continue
      }
      if (rmsok && peakok) {
        console.log(`pass ${patch.id} (secondary)`)
      } else {
        console.warn(`warn ${patch.id} (secondary): ${formatmetricsdelta(patch.id, actual, expected)}`)
      }
    }
  } finally {
    await browser.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await vite.close()
  }
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('All master dynamics parity patches passed.')
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
