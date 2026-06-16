import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import {
  startparityvite,
  stopparityvite,
} from 'tasks/lib/parity/parity-vite-server.ts'

import { evalsosvoicegate } from '../zss/feature/synth/backend/daisy/sosvoicegate.ts'
import { SOS_VOICE_PATCHES } from '../zss/feature/synth/backend/daisy/sosvoicepatches.ts'
import type { PARITY_AUDIO_METRICS } from '../zss/feature/synth/backend/wasm/paritymetrics.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const FIXTURE_PATH = path.join(
  PROJECT,
  'ops/fixtures/synth/daisy/sos-voice-fixtures.json',
)
const REGEN_PORT = 9883

type FIXTURE_FILE = {
  patches: Record<string, PARITY_AUDIO_METRICS>
}

function loadfixtures(): FIXTURE_FILE {
  const raw = readFileSync(FIXTURE_PATH, 'utf8')
  return JSON.parse(raw) as FIXTURE_FILE
}

async function rendersospatch(
  page: import('@playwright/test').Page,
  patchid: string,
): Promise<PARITY_AUDIO_METRICS> {
  const params = new URLSearchParams({ patch: patchid })
  const url = `http://127.0.0.1:${REGEN_PORT}/sos-voice-regen.html?${params.toString()}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 })
  await page.waitForFunction(
    () => {
      const el = document.getElementById('out')
      return el && el.textContent && !el.textContent.startsWith('rendering')
    },
    { timeout: 180000 },
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

async function main() {
  const fixtures = loadfixtures()
  const handle = await startparityvite(PROJECT, REGEN_PORT)
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const failures: string[] = []

  try {
    for (const patch of SOS_VOICE_PATCHES) {
      const expected = fixtures.patches[patch.id]
      if (!expected) {
        failures.push(`${patch.id} | missing fixture entry`)
        continue
      }
      const actual = await rendersospatch(page, patch.id)
      const gate = evalsosvoicegate(patch.id, actual, expected)
      if (!gate.pass) {
        failures.push(gate.reason)
      } else {
        console.log(gate.reason)
      }
    }
  } finally {
    await browser.close()
    await stopparityvite(handle)
  }

  if (failures.length > 0) {
    console.error('SOS voice gate failures:')
    for (const line of failures) {
      console.error(`  ${line}`)
    }
    process.exit(1)
  }
  console.log(`all ${SOS_VOICE_PATCHES.length} SOS voice patches passed`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
