/**
 * Tone vs Daisy synth env parity (long release, multi-wave).
 *
 * Usage: yarn synth-env-parity:render
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

import {
  evalsynthenvparitygate,
  formatsynthenvparityreport,
} from '../zss/feature/synth/backend/daisy/synthenvparitygate.ts'
import { SYNTH_ENV_PARITY_SCENARIOS } from '../zss/feature/synth/backend/daisy/synthenvparityscenario.ts'

import {
  PARITY_RENDER_SCRIPT_TIMEOUT_MS,
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from './parity-timeouts.ts'
import { startparityvite, stopparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const PORT = 9888
const HOST_URL = `http://127.0.0.1:${PORT}/offline-render-host.html`
const OUTDIR = path.join(PROJECT, 'cafe/public/renders/synth-env-parity')

async function runrenders() {
  fs.mkdirSync(OUTDIR, { recursive: true })

  const parity = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch({ timeout: 60_000 })
  const reportentries: {
    id: string
    gate: ReturnType<typeof evalsynthenvparitygate>
    rendersec: number
  }[] = []

  try {
    for (const scenario of SYNTH_ENV_PARITY_SCENARIOS) {
      console.log(`Rendering synth env parity: ${scenario.id}…`)
      const page = await browser.newPage()
      page.setDefaultTimeout(PLAYWRIGHT_SCENARIO_TIMEOUT_MS)
      await page.goto(HOST_URL, {
        waitUntil: 'domcontentloaded',
        timeout: PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
      })

      const payload = await page.evaluate(
        async ({ scenarioid, windowms }) => {
          const { runenvparityscenario } =
            await import('/zss/feature/synth/backend/daisy/envparityrender.ts')
          const { arraybuffertobase64 } =
            await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
          const { SYNTH_ENV_PARITY_SCENARIOS } =
            await import('/zss/feature/synth/backend/daisy/synthenvparityscenario.ts')
          const { analyzesynthenvparity } =
            await import('/zss/feature/synth/backend/daisy/synthenvparity.ts')

          const scenario = SYNTH_ENV_PARITY_SCENARIOS.find(
            (s) => s.id === scenarioid,
          )
          if (!scenario) {
            throw new Error(`unknown scenario ${scenarioid}`)
          }
          const render = await runenvparityscenario(scenario, windowms)
          const analyzed = analyzesynthenvparity(
            scenario.id,
            render.daisysamples,
            render.daisysamplerate,
            render.tonemono,
            render.tonesamplerate,
            undefined,
            undefined,
            render.rendersec,
            windowms,
          )
          return {
            id: scenario.id,
            analyzed,
            rendersec: render.rendersec,
            report: render.report,
            daisywavbase64: arraybuffertobase64(render.daisywav),
            tonewavbase64: arraybuffertobase64(render.tonewav),
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
      const gate = evalsynthenvparitygate(payload.analyzed)
      fs.writeFileSync(
        path.join(OUTDIR, `${scenario.id}.json`),
        JSON.stringify({ result: payload.analyzed, gate }, null, 2),
      )
      fs.writeFileSync(
        path.join(OUTDIR, `${scenario.id}.txt`),
        formatsynthenvparityreport(gate, payload.rendersec),
      )

      console.log(formatsynthenvparityreport(gate, payload.rendersec))
      console.log('')

      reportentries.push({
        id: scenario.id,
        gate,
        rendersec: payload.rendersec,
      })
      await page.close()
    }

    fs.writeFileSync(
      path.join(OUTDIR, 'report.json'),
      JSON.stringify({ scenarios: reportentries }, null, 2),
    )
  } finally {
    await browser.close()
    await stopparityvite(parity)
  }
}

withscripttimeout(
  'synth-env-parity:render',
  PARITY_RENDER_SCRIPT_TIMEOUT_MS,
  runrenders,
).catch((err) => {
  console.error(err)
  process.exit(1)
})
