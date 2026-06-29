/**
 * Regen Tone metrics for env-adsr-sustain / env-adsr-retrigger only.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { PARITY_AUDIO_METRICS } from 'ops/lib/daisy-parity/paritymetrics'
import { ENVELOPE_ADSR_PARITY_PATCHES } from 'ops/lib/daisy-parity/paritypatches'
import {
  launchparitybrowser,
  parityhosturl,
} from 'tasks/lib/parity/parity-playwright.ts'
import {
  startparityvite,
  stopparityvite,
} from 'tasks/lib/parity/parity-vite-server.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const OUT = path.join(
  PROJECT,
  'ops/fixtures/synth/wasm/parity-metrics-tone.json',
)
const PORT = 9878

async function renderpatchmetrics(
  page: import('@playwright/test').Page,
  patchid: string,
): Promise<PARITY_AUDIO_METRICS> {
  const parsed = await page.evaluate(
    async (args) => {
      const { runparityregen } =
        await import('/ops/lib/daisy-parity/parity-regen-runner.ts')
      return runparityregen(args)
    },
    { patchid, kind: 'voice' as const, backend: 'tone' as const },
  )
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
  const browser = await launchparitybrowser()
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(180_000)
    await page.goto(parityhosturl(PORT), {
      waitUntil: 'domcontentloaded',
      timeout: 180000,
    })
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
