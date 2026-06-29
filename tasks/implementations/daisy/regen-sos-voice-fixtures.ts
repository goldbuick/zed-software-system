import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { PARITY_AUDIO_METRICS } from 'ops/lib/daisy-parity/paritymetrics'
import {
  launchparitybrowser,
  parityhosturl,
} from 'tasks/lib/parity/parity-playwright.ts'
import {
  startparityvite,
  stopparityvite,
} from 'tasks/lib/parity/parity-vite-server.ts'

import { SOS_VOICE_PATCHES } from '../zss/feature/synth/backend/daisy/sosvoicepatches.ts'

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
  return page.evaluate(
    async (args) => {
      const { runsosvoiceregen } =
        await import('/ops/lib/daisy-parity/sos-voice-regen-runner.ts')
      return runsosvoiceregen(args)
    },
    { patchid: patchid ?? undefined },
  )
}

async function main() {
  const handle = await startparityvite(PROJECT, REGEN_PORT)
  const browser = await launchparitybrowser()
  const page = await browser.newPage()
  page.setDefaultTimeout(300_000)
  await page.goto(parityhosturl(REGEN_PORT), {
    waitUntil: 'domcontentloaded',
    timeout: 300000,
  })
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
