import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import {
  startparityvite,
  stopparityvite,
} from 'tasks/lib/parity/parity-vite-server.ts'

import { SOS_VOICE_PATCHES } from '../zss/feature/synth/backend/daisy/sosvoicepatches.ts'
import type { PARITY_AUDIO_METRICS } from 'ops/lib/daisy-parity/paritymetrics'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const OUT = path.join(
  PROJECT,
  'ops/fixtures/synth/daisy/sos-voice-fixtures.json',
)
const REGEN_PORT = 9882

async function rendersospatch(
  page: import('@playwright/test').Page,
  patchid: string | null,
): Promise<Record<string, PARITY_AUDIO_METRICS>> {
  const params = new URLSearchParams()
  if (patchid) {
    params.set('patch', patchid)
  }
  const url = `http://127.0.0.1:${REGEN_PORT}/sos-voice-regen.html?${params.toString()}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 300000 })
  await page.waitForFunction(
    () => {
      const el = document.getElementById('out')
      return el && el.textContent && !el.textContent.startsWith('rendering')
    },
    { timeout: 300000 },
  )
  const body = await page.locator('#out').textContent()
  if (!body || body.startsWith('error:')) {
    throw new Error(body ?? 'empty sos regen response')
  }
  return JSON.parse(body) as Record<string, PARITY_AUDIO_METRICS>
}

async function main() {
  const handle = await startparityvite(PROJECT, REGEN_PORT)
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const patches: Record<string, PARITY_AUDIO_METRICS> = {}

  try {
    for (const patch of SOS_VOICE_PATCHES) {
      const chunk = await rendersospatch(page, patch.id)
      patches[patch.id] = chunk[patch.id]
      if (!patches[patch.id]) {
        throw new Error(`missing metrics for ${patch.id}`)
      }
    }
    const payload = {
      generated: new Date().toISOString(),
      patches,
    }
    writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
    console.log(`wrote ${OUT} (${SOS_VOICE_PATCHES.length} patches)`)
  } finally {
    await browser.close()
    await stopparityvite(handle)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
