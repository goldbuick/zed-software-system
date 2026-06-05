/**
 * Tone vs Daisy env parity offline renders.
 *
 * Usage: yarn test:env-parity
 *
 * Outputs: cafe/public/renders/env-parity/
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

import type { ENV_PARITY_RESULT } from '../zss/feature/synth/backend/daisy/envparityrender.ts'
import { ENV_PARITY_SCENARIOS } from '../zss/feature/synth/backend/daisy/envparityscenario.ts'

import {
  PARITY_RENDER_SCRIPT_TIMEOUT_MS,
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from './parity-timeouts.ts'
import { startparityvite, stopparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const PORT = 9886
const HOST_URL = `http://127.0.0.1:${PORT}/offline-render-host.html`
const OUTDIR = path.join(PROJECT, 'cafe/public/renders/env-parity')

const PEAK_TOLERANCE_DB = 6
const RMS_TOLERANCE_DB = 6
const RETRIGGER_SCENARIO_ID = 'env-parity-amsaw-8n'
const GATED_SCENARIO_IDS = new Set(
  ENV_PARITY_SCENARIOS.map((scenario) => scenario.id),
)

function assertparity(payload: {
  id: string
  daisy: { overallpeakdb: number; overallrmsdb: number }
  tone: { overallpeakdb: number; overallrmsdb: number }
  spread: { delta: number }
  timelinesmatch?: boolean
}): string | undefined {
  if (!GATED_SCENARIO_IDS.has(payload.id)) {
    return undefined
  }
  const peakdelta = Math.abs(
    payload.daisy.overallpeakdb - payload.tone.overallpeakdb,
  )
  const rmsdelta = Math.abs(
    payload.daisy.overallrmsdb - payload.tone.overallrmsdb,
  )
  if (peakdelta > PEAK_TOLERANCE_DB) {
    return `peak delta ${peakdelta.toFixed(1)} dB exceeds ${PEAK_TOLERANCE_DB} dB`
  }
  if (payload.id !== 'env-parity-amsaw' && rmsdelta > RMS_TOLERANCE_DB) {
    return `RMS delta ${rmsdelta.toFixed(1)} dB exceeds ${RMS_TOLERANCE_DB} dB`
  }
  if (
    payload.id === RETRIGGER_SCENARIO_ID &&
    payload.timelinesmatch === false
  ) {
    return `peak timeline ASCII mismatch (want Tone shape e.g. ===##==##==##=---)`
  }
  return undefined
}

async function runenvparity() {
  fs.mkdirSync(OUTDIR, { recursive: true })

  const parity = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch({ timeout: 60_000 })
  const results: ENV_PARITY_RESULT[] = []
  let failed = false

  try {
    for (const scenario of ENV_PARITY_SCENARIOS) {
      console.log(`Rendering env parity: ${scenario.id}…`)
      const page = await browser.newPage()
      page.setDefaultTimeout(PLAYWRIGHT_SCENARIO_TIMEOUT_MS)
      await page.goto(HOST_URL, {
        waitUntil: 'domcontentloaded',
        timeout: PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
      })
      const payload = await page.evaluate(
        async ({ scenarioid, windowms }) => {
          const { runenvparityscenario, envparitytimelinesmatchsamples } =
            await import('/zss/feature/synth/backend/daisy/envparityrender.ts')
          const { arraybuffertobase64 } =
            await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
          const { envparityscenario, envparityretriggerscenario } =
            await import('/zss/feature/synth/backend/daisy/envparityscenario.ts')

          const scenario =
            scenarioid === 'env-parity-amsaw-8n'
              ? envparityretriggerscenario()
              : envparityscenario()

          const result = await runenvparityscenario(scenario, windowms)
          const timelinesmatch =
            scenarioid === 'env-parity-amsaw-8n'
              ? envparitytimelinesmatchsamples(
                  result.daisysamples,
                  result.daisysamplerate,
                  result.tonemono,
                  result.tonesamplerate,
                  result.rendersec,
                  windowms,
                )
              : true
          return {
            id: result.id,
            daisy: result.daisy,
            tone: result.tone,
            spread: result.spread,
            report: result.report,
            rendersec: result.rendersec,
            timelinesmatch,
            daisywavbase64: arraybuffertobase64(result.daisywav),
            tonewavbase64: arraybuffertobase64(result.tonewav),
          }
        },
        { scenarioid: scenario.id, windowms: 46 },
      )

      fs.writeFileSync(
        path.join(OUTDIR, `${scenario.id}-daisy.wav`),
        Buffer.from(payload.daisywavbase64, 'base64'),
      )
      fs.writeFileSync(
        path.join(OUTDIR, `${scenario.id}-tone.wav`),
        Buffer.from(payload.tonewavbase64, 'base64'),
      )
      fs.writeFileSync(path.join(OUTDIR, `${scenario.id}.txt`), payload.report)

      results.push({
        id: payload.id,
        daisy: payload.daisy,
        tone: payload.tone,
        spread: payload.spread,
        report: payload.report,
      })

      console.log(payload.report)
      console.log('')

      const failreason = assertparity(payload)
      if (failreason) {
        console.error(`FAIL ${scenario.id}: ${failreason}`)
        failed = true
      }
      await page.close()
    }

    fs.writeFileSync(
      path.join(OUTDIR, 'report.json'),
      JSON.stringify(
        {
          results,
          gates: {
            scenarios: [...GATED_SCENARIO_IDS],
            peaktolerancedb: PEAK_TOLERANCE_DB,
            rmstolerancedb: RMS_TOLERANCE_DB,
            retriggertimeline: `exact ASCII match required for ${RETRIGGER_SCENARIO_ID}`,
            spread: 'reported in report only',
          },
        },
        null,
        2,
      ),
    )
  } finally {
    await browser.close()
    await stopparityvite(parity)
  }

  if (failed) {
    process.exit(1)
  }
}

withscripttimeout(
  'test:env-parity',
  PARITY_RENDER_SCRIPT_TIMEOUT_MS,
  runenvparity,
).catch((err) => {
  console.error(err)
  process.exit(1)
})
