/**
 * Offline render of the user level-issue song via archived Tone.js → WAV + metrics.
 *
 * Usage:
 *   yarn render:level-issue-song:tone
 *
 * Outputs:
 *   cafe/public/renders/level-issue-song-tone.wav
 *   cafe/public/renders/level-issue-song-tone.json
 *   cafe/public/renders/level-issue-song-tone.txt
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

import type { SONG_RENDER_PAYLOAD } from '../zss/feature/synth/backend/daisy/daisysongrender.ts'
import { levelissuescenario, levelissuesongmeta } from '../zss/feature/synth/backend/daisy/levelissuesong.ts'

import { startparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const PORT = 9881
const OUTDIR = path.join(PROJECT, 'cafe/public/renders')

async function main() {
  fs.mkdirSync(OUTDIR, { recursive: true })

  const meta = levelissuesongmeta()
  console.log('Song meta:', JSON.stringify(meta, null, 2))

  const { server } = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(600_000)
    console.log('Rendering Tone offline (this may take several minutes)…')
    await page.goto(`http://127.0.0.1:${PORT}/level-stability.html`, {
      waitUntil: 'domcontentloaded',
    })

    const payload = await page.evaluate(async () => {
      const { rendertonesongpayload } = await import(
        '/zss/feature/synth/backend/wasm/tonesongrender.ts'
      )
      const { levelissuescenario } = await import(
        '/zss/feature/synth/backend/daisy/levelissuesong.ts'
      )
      return rendertonesongpayload(levelissuescenario())
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
    console.log(`Compare Daisy: afplay ${path.join(OUTDIR, 'level-issue-song.wav')}`)
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
