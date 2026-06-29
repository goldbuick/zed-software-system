import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { PARITY_AUDIO_METRICS } from 'ops/lib/daisy-parity/paritymetrics'
import { evalsosvoicegate } from 'ops/lib/daisy-parity/sosvoicegate'
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
  const parsed = await page.evaluate(
    async (args) => {
      const { runsosvoiceregen } =
        await import('/ops/lib/daisy-parity/sos-voice-regen-runner.ts')
      return runsosvoiceregen(args)
    },
    { patchid },
  )
  const metrics = parsed[patchid]
  if (!metrics) {
    throw new Error(`missing metrics for ${patchid}`)
  }
  return metrics
}

async function main() {
  const fixtures = loadfixtures()
  const handle = await startparityvite(PROJECT, REGEN_PORT)
  const browser = await launchparitybrowser()
  const page = await browser.newPage()
  page.setDefaultTimeout(180_000)
  await page.goto(parityhosturl(REGEN_PORT), {
    waitUntil: 'domcontentloaded',
    timeout: 180000,
  })
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
