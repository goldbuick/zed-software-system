import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { PARITY_AUDIO_METRICS } from 'ops/lib/daisy-parity/paritymetrics'
import { DRUM_PARITY_PATCHES } from 'ops/lib/daisy-parity/paritypatches'
import {
  launchparitybrowser,
  parityhosturl,
} from 'tasks/lib/parity/parity-playwright.ts'
import { startparityvite } from 'tasks/lib/parity/parity-vite-server.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const OUT = path.join(
  PROJECT,
  'ops/fixtures/synth/wasm/parity-metrics-daisy.json',
)
const REGEN_PORT = 9878

function metricsusable(metrics: PARITY_AUDIO_METRICS): boolean {
  return metrics.rmsdb > -119
}

async function renderdrummetrics(
  page: import('@playwright/test').Page,
  patchid: string,
): Promise<PARITY_AUDIO_METRICS> {
  const parsed = await page.evaluate(
    async (args) => {
      const { runparityregen } =
        await import('/ops/lib/daisy-parity/parity-regen-runner.ts')
      return runparityregen(args)
    },
    { patchid, kind: 'drum' as const, backend: 'daisy' as const },
  )
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
  const browser = await launchparitybrowser()
  const patches: Record<string, PARITY_AUDIO_METRICS> = { ...existing }
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(180_000)
    await page.goto(parityhosturl(REGEN_PORT), {
      waitUntil: 'domcontentloaded',
      timeout: 180000,
    })
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
