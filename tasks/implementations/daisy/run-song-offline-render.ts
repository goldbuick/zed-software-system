/**
 * Offline render of the user level-issue song → WAV + metrics report.
 *
 * Usage:
 *   yarn level-issue-song:render
 *
 * Outputs:
 *   ops/fixtures/renders/level-issue-song.wav
 *   ops/fixtures/renders/level-issue-song.json
 *   ops/fixtures/renders/level-issue-song.txt
 *
 * Browser preview (yarn app:dev):
 *   https://localhost:7777/song-offline-render.html
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { RENDERS_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import { chromium } from '@playwright/test'
import {
  startparityvite,
  stopparityvite,
} from 'tasks/lib/parity/parity-vite-server.ts'

import type { SONG_RENDER_PAYLOAD } from '../zss/feature/synth/backend/daisy/daisysongrender.ts'
import {
  levelissuescenario,
  levelissuesongmeta,
} from '../zss/feature/synth/backend/daisy/levelissuesong.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const PORT = 9880
const OUTDIR = RENDERS_FIXTURES_DIR

async function main() {
  fs.mkdirSync(OUTDIR, { recursive: true })

  const meta = levelissuesongmeta()
  console.log('Song meta:', JSON.stringify(meta, null, 2))

  const parity = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(600_000)
    console.log('Rendering in browser (this may take several minutes)…')
    await page.goto(`http://127.0.0.1:${PORT}/level-stability.html`, {
      waitUntil: 'domcontentloaded',
    })

    const payload = await page.evaluate(async () => {
      const { renderdaisysongpayload } =
        await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
      const { levelissuescenario } =
        await import('/zss/feature/synth/backend/daisy/levelissuesong.ts')
      return renderdaisysongpayload(levelissuescenario())
    })

    const typed = payload as SONG_RENDER_PAYLOAD
    const wavpath = path.join(OUTDIR, `${typed.meta.scenarioid}.wav`)
    const jsonpath = path.join(OUTDIR, `${typed.meta.scenarioid}.json`)
    const txtpath = path.join(OUTDIR, `${typed.meta.scenarioid}.txt`)

    fs.writeFileSync(wavpath, Buffer.from(typed.wavbase64, 'base64'))
    fs.writeFileSync(
      jsonpath,
      JSON.stringify(
        {
          meta: typed.meta,
          songmeta: meta,
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
    console.log(`Browser: https://localhost:7777/song-offline-render.html`)
  } finally {
    await browser.close()
    await stopparityvite(parity)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
