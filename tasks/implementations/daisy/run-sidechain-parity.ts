/**
 * Offline sidechain parity: SC on/off duck depth + optional Tone compare.
 *
 * Usage:
 *   yarn sidechain-parity:render
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import {
  SIDECHAIN_PARITY_PATCH_ID,
  type SIDECHAIN_PARITY_RESULT,
  analyzeduckdepth,
  analyzeduckdepthpair,
  evalsidechainparitygate,
  formatsidechainparityreport,
  metricsfromsamples,
} from 'ops/lib/daisy-parity/sidechainparity'
import { RENDERS_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import {
  PARITY_RENDER_SCRIPT_TIMEOUT_MS,
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts.ts'
import {
  startparityvite,
  stopparityvite,
} from 'tasks/lib/parity/parity-vite-server.ts'
import { decodewav } from 'tasks/lib/parity/parity-wav.ts'

import { SIDECHAIN_SCENARIO_ID } from '../zss/feature/synth/backend/daisy/sidechainscenario.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const PORT = 9886
const OUTDIR = RENDERS_FIXTURES_DIR
const HOST_URL = `http://127.0.0.1:${PORT}/offline-render-host.html`
const PARITY_JSON = path.join(
  OUTDIR,
  `${SIDECHAIN_SCENARIO_ID}-sidechain-parity.json`,
)
const TONE_FIXTURE = path.join(
  PROJECT,
  'ops/fixtures/synth/wasm/parity-metrics-tone.json',
)

async function renderdaisypass(
  page: import('@playwright/test').Page,
  sidechainbypass: boolean,
): Promise<{ samples: Float32Array; samplerate: number }> {
  return page.evaluate(async (bypass) => {
    const { renderdaisysongpayload } =
      await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
    const { sidechainabscenario } =
      await import('/zss/feature/synth/backend/daisy/sidechainscenario.ts')
    const scenario = { ...sidechainabscenario(), sidechainbypass: bypass }
    const payload = await renderdaisysongpayload(scenario)
    const binary = atob(payload.wavbase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const view = new DataView(bytes.buffer)
    const samplerate = view.getUint32(24, true)
    const samplecount = view.getUint32(40, true) / 2
    const samples = new Float32Array(samplecount)
    let offset = 44
    for (let i = 0; i < samplecount; i++) {
      samples[i] = view.getInt16(offset, true) / 0x8000
      offset += 2
    }
    return { samples, samplerate }
  }, sidechainbypass)
}

async function rendertonefixture(
  page: import('@playwright/test').Page,
): Promise<{ peakdb: number; rmsdb: number } | undefined> {
  try {
    return await page.evaluate(async () => {
      const { rendertonelevelscenario } =
        await import('/ops/lib/daisy-parity/toneparityrender.ts')
      const { sidechainabscenario } =
        await import('/zss/feature/synth/backend/daisy/sidechainscenario.ts')
      const { audiobuffermetrics } =
        await import('/ops/lib/daisy-parity/paritymetrics.ts')
      const buffer = await rendertonelevelscenario(sidechainabscenario())
      const m = audiobuffermetrics(buffer)
      return { peakdb: m.peakdb, rmsdb: m.rmsdb }
    })
  } catch (err) {
    console.warn('Tone render skipped:', err)
    return undefined
  }
}

function loadtonefixture(): { peakdb: number; rmsdb: number } | undefined {
  if (!fs.existsSync(TONE_FIXTURE)) {
    return undefined
  }
  const fixtures = JSON.parse(fs.readFileSync(TONE_FIXTURE, 'utf8')) as {
    patches: Record<string, { peakdb: number; rmsdb: number }>
  }
  return fixtures.patches[SIDECHAIN_PARITY_PATCH_ID]
}

async function main() {
  fs.mkdirSync(OUTDIR, { recursive: true })

  const parity = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch()

  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(PLAYWRIGHT_SCENARIO_TIMEOUT_MS)
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.startsWith('[sidechain') || text.startsWith('[daisy')) {
        console.log(text)
      }
    })
    await page.goto(HOST_URL, { waitUntil: 'domcontentloaded' })

    console.log('Rendering duck-bg-stab SC ON…')
    const on = await renderdaisypass(page, false)
    console.log('Rendering duck-bg-stab SC OFF…')
    const off = await renderdaisypass(page, true)

    const tonelive = await rendertonefixture(page)
    await page.close()

    const tonefixture = loadtonefixture()
    const tonemetrics = tonelive ?? tonefixture

    const result: SIDECHAIN_PARITY_RESULT = {
      duckon: analyzeduckdepth(on.samples, on.samplerate),
      duckoff: analyzeduckdepth(off.samples, off.samplerate),
      abduckdepthdb: analyzeduckdepthpair(
        on.samples,
        off.samples,
        on.samplerate,
      ),
      daisymetrics: metricsfromsamples(on.samples, on.samplerate),
      tonemetrics: tonemetrics
        ? {
            peakdb: tonemetrics.peakdb,
            rmsdb: tonemetrics.rmsdb,
            length: on.samples.length,
            samplerate: on.samplerate,
            centroidhz: 0,
            bandlow: 0,
            bandmid: 0,
            bandhigh: 0,
          }
        : undefined,
    }

    const gate = evalsidechainparitygate(result)
    fs.writeFileSync(PARITY_JSON, JSON.stringify({ result, gate }, null, 2))
    fs.writeFileSync(
      path.join(OUTDIR, `${SIDECHAIN_SCENARIO_ID}-sidechain-parity.txt`),
      formatsidechainparityreport(gate),
    )

    console.log('')
    console.log(formatsidechainparityreport(gate))
    console.log('')
    console.log(`JSON: ${PARITY_JSON}`)
  } finally {
    await browser.close()
    await stopparityvite(parity)
  }
}

withscripttimeout(
  'sidechain-parity:render',
  PARITY_RENDER_SCRIPT_TIMEOUT_MS,
  main,
).catch((err) => {
  console.error(err)
  process.exit(1)
})
