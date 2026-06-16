/**
 * Offline render of the note-pop repro → WAV + metrics report.
 *
 * Usage:
 *   yarn notepop:render
 *   yarn notepop:render --no-comp
 *   yarn notepop:render:ab
 *
 * Outputs:
 *   cafe/public/renders/notepop-qcxdxexfx.wav (default)
 *   cafe/public/renders/notepop-qcxdxexfx-comp-on.* / -comp-off.* (--ab)
 *
 * Browser preview (yarn app:dev):
 *   https://localhost:7777/song-offline-render.html?scenario=notepop
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import {
  startparityvite,
  stopparityvite,
} from 'tasks/lib/parity/parity-vite-server.ts'

import type { SONG_RENDER_PAYLOAD } from '../zss/feature/synth/backend/daisy/daisysongrender.ts'
import {
  notepopmeta,
  notepopscenario,
} from '../zss/feature/synth/backend/daisy/notepopscenario.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const PORT = 9881
const OUTDIR = path.join(PROJECT, 'cafe/public/renders')
const HOST_URL = `http://127.0.0.1:${PORT}/offline-render-host.html`

type RENDER_PASS = {
  suffix: string
  maincompbypass: boolean
}

function parsepasses(): RENDER_PASS[] {
  const ab = process.argv.includes('--ab')
  const nocomp = process.argv.includes('--no-comp')
  if (ab) {
    return [
      { suffix: '-comp-on', maincompbypass: false },
      { suffix: '-comp-off', maincompbypass: true },
    ]
  }
  if (nocomp) {
    return [{ suffix: '-comp-off', maincompbypass: true }]
  }
  return [{ suffix: '', maincompbypass: false }]
}

async function renderpass(
  page: import('@playwright/test').Page,
  maincompbypass: boolean,
): Promise<SONG_RENDER_PAYLOAD> {
  return page.evaluate(async (bypass) => {
    const { renderdaisysongpayload } =
      await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
    const { notepopscenario } =
      await import('/zss/feature/synth/backend/daisy/notepopscenario.ts')
    const scenario = {
      ...notepopscenario(),
      maincompbypass: bypass,
    }
    console.warn('[notepop] booting daisy wasm…')
    const payload = await renderdaisysongpayload(scenario)
    console.warn('[notepop] render complete, encoding wav…')
    return payload
  }, maincompbypass)
}

async function main() {
  fs.mkdirSync(OUTDIR, { recursive: true })

  const meta = notepopmeta()
  const passes = parsepasses()
  console.log('Note pop meta:', JSON.stringify(meta, null, 2))

  const parity = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch()

  try {
    for (const pass of passes) {
      const passpage = await browser.newPage()
      passpage.setDefaultTimeout(600_000)
      passpage.on('console', (msg) => {
        const text = msg.text()
        if (
          text.startsWith('[notepop]') ||
          text.startsWith('[daisy boot]') ||
          text.startsWith('[daisy render]')
        ) {
          console.log(text)
        }
      })

      await passpage.goto(HOST_URL, { waitUntil: 'domcontentloaded' })
      console.log(
        `Rendering notepop${pass.suffix || ''} (comp ${pass.maincompbypass ? 'OFF' : 'ON'})…`,
      )
      const payload = await renderpass(passpage, pass.maincompbypass)
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
            notepopmeta: meta,
            maincompbypass: pass.maincompbypass,
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
      `Browser: https://localhost:7777/song-offline-render.html?scenario=notepop`,
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
