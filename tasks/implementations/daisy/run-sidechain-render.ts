/**
 * Offline A/B render for play-bus sidechain duck (duck-bg-stab scenario).
 *
 * Usage:
 *   yarn sidechain:render
 *   yarn sidechain:render --no-sc
 *   yarn sidechain:render:ab
 *
 * Outputs:
 *   ops/fixtures/renders/duck-bg-stab.wav (default, sidechain ON)
 *   ops/fixtures/renders/duck-bg-stab-sc-on.* / -sc-off.* (--ab)
 *
 * Browser preview (yarn app:dev):
 *   https://localhost:7777/song-offline-render.html?scenario=sidechain
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import { RENDERS_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import {
  startparityvite,
  stopparityvite,
} from 'tasks/lib/parity/parity-vite-server.ts'

import type { SONG_RENDER_PAYLOAD } from '../zss/feature/synth/backend/daisy/daisysongrender.ts'
import {
  SIDECHAIN_SCENARIO_ID,
  sidechainabscenario,
} from '../zss/feature/synth/backend/daisy/sidechainscenario.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const PORT = 9882
const OUTDIR = RENDERS_FIXTURES_DIR
const HOST_URL = `http://127.0.0.1:${PORT}/offline-render-host.html`

type RENDER_PASS = {
  suffix: string
  sidechainbypass: boolean
}

function parsepasses(): RENDER_PASS[] {
  const ab = process.argv.includes('--ab')
  const nosc = process.argv.includes('--no-sc')
  if (ab) {
    return [
      { suffix: '-sc-on', sidechainbypass: false },
      { suffix: '-sc-off', sidechainbypass: true },
    ]
  }
  if (nosc) {
    return [{ suffix: '-sc-off', sidechainbypass: true }]
  }
  return [{ suffix: '', sidechainbypass: false }]
}

async function renderpass(
  page: import('@playwright/test').Page,
  sidechainbypass: boolean,
): Promise<SONG_RENDER_PAYLOAD> {
  return page.evaluate(async (bypass) => {
    const { renderdaisysongpayload } =
      await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
    const { sidechainabscenario } =
      await import('/zss/feature/synth/backend/daisy/sidechainscenario.ts')
    const scenario = {
      ...sidechainabscenario(),
      sidechainbypass: bypass,
    }
    console.warn('[sidechain] booting daisy wasm…')
    const payload = await renderdaisysongpayload(scenario)
    console.warn('[sidechain] render complete, encoding wav…')
    return payload
  }, sidechainbypass)
}

async function main() {
  fs.mkdirSync(OUTDIR, { recursive: true })

  const scenario = sidechainabscenario()
  const passes = parsepasses()
  console.log('Sidechain scenario:', scenario.id, scenario.description)

  const parity = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch()

  try {
    for (const pass of passes) {
      const passpage = await browser.newPage()
      passpage.setDefaultTimeout(600_000)
      passpage.on('console', (msg) => {
        const text = msg.text()
        if (
          text.startsWith('[sidechain]') ||
          text.startsWith('[daisy boot]') ||
          text.startsWith('[daisy render]')
        ) {
          console.log(text)
        }
      })

      await passpage.goto(HOST_URL, { waitUntil: 'domcontentloaded' })
      console.log(
        `Rendering ${SIDECHAIN_SCENARIO_ID}${pass.suffix || ''} (sidechain ${pass.sidechainbypass ? 'OFF' : 'ON'})…`,
      )
      const payload = await renderpass(passpage, pass.sidechainbypass)
      await passpage.close()
      const typed = payload
      const basename = `${typed.meta.scenarioid}${pass.suffix}`
      const wavpath = path.join(OUTDIR, `${basename}.wav`)
      const jsonpath = path.join(OUTDIR, `${basename}.json`)
      const txtpath = path.join(OUTDIR, `${basename}.txt`)

      fs.writeFileSync(wavpath, Buffer.from(typed.wavbase64, 'base64'))
      fs.writeFileSync(
        jsonpath,
        JSON.stringify(
          {
            meta: typed.meta,
            sidechainbypass: pass.sidechainbypass,
            metrics: typed.metrics,
            loudestwindows: typed.loudestwindows,
          },
          null,
          2,
        ),
      )
      fs.writeFileSync(txtpath, typed.report)

      console.log('')
      console.log(typed.report)
      console.log('')
      console.log(`WAV:  ${wavpath}`)
      console.log(`JSON: ${jsonpath}`)
      console.log(`TXT:  ${txtpath}`)
      console.log('')
      console.log(`Listen: afplay ${wavpath}`)
    }

    console.log(
      `Browser: https://localhost:7777/song-offline-render.html?scenario=sidechain`,
    )
  } finally {
    await browser.close()
    await stopparityvite(parity)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
