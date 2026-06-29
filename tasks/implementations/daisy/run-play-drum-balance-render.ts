/**
 * Offline play vs drum balance stems → WAV + JSON.
 *
 * Usage:
 *   yarn play-drum-balance:render
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  launchparitybrowser,
  parityhosturl,
} from 'tasks/lib/parity/parity-playwright.ts'
import { RENDERS_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import {
  startparityvite,
  stopparityvite,
} from 'tasks/lib/parity/parity-vite-server.ts'

import {
  analyzeplaydrumbalance,
  evalplaydrumbalancegate,
  formatplaydrumbalancereport,
} from '../zss/feature/synth/backend/daisy/playdrumbalance.ts'
import {
  PLAY_DRUM_BALANCE_SCENARIO_ID,
  playdrumbalancedrumscenario,
  playdrumbalanceplayscenario,
} from '../zss/feature/synth/backend/daisy/playdrumbalancescenario.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const PORT = 9884
const OUTDIR = RENDERS_FIXTURES_DIR

function encodewavmono16(samples: Float32Array, samplerate: number): Buffer {
  const datasize = samples.length * 2
  const buffer = Buffer.alloc(44 + datasize)
  const view = new DataView(buffer.buffer)
  const write = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      buffer[o + i] = s.charCodeAt(i)
    }
  }
  write(0, 'RIFF')
  view.setUint32(4, 36 + datasize, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, samplerate, true)
  view.setUint32(28, samplerate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, datasize, true)
  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const c = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, c < 0 ? c * 0x8000 : c * 0x7fff, true)
    off += 2
  }
  return buffer
}

async function renderstem(
  page: import('@playwright/test').Page,
  stem: 'play' | 'drum',
): Promise<{ samples: Float32Array; samplerate: number; meta: object }> {
  return page.evaluate(async (which) => {
    const { renderdaisysongpayload } =
      await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
    const { playdrumbalanceplayscenario, playdrumbalancedrumscenario } =
      await import('/zss/feature/synth/backend/daisy/playdrumbalancescenario.ts')
    const scenario =
      which === 'play'
        ? playdrumbalanceplayscenario()
        : playdrumbalancedrumscenario()
    console.warn(`[play-drum-balance] render ${which}…`)
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
    return { samples, samplerate, meta: payload.meta }
  }, stem)
}

async function main() {
  fs.mkdirSync(OUTDIR, { recursive: true })

  const parity = await startparityvite(PROJECT, PORT)
  const browser = await launchparitybrowser()

  try {
    const playpage = await browser.newPage()
    const drumpage = await browser.newPage()
    for (const p of [playpage, drumpage]) {
      p.setDefaultTimeout(600_000)
      p.on('console', (msg) => {
        const text = msg.text()
        if (
          text.startsWith('[play-drum-balance]') ||
          text.startsWith('[daisy boot]') ||
          text.startsWith('[daisy render]')
        ) {
          console.log(text)
        }
      })
    }

    await playpage.goto(parityhosturl(PORT), { waitUntil: 'domcontentloaded' })
    await drumpage.goto(parityhosturl(PORT), { waitUntil: 'domcontentloaded' })

    const playrender = await renderstem(playpage, 'play')
    const drumrender = await renderstem(drumpage, 'drum')
    await playpage.close()
    await drumpage.close()

    const balance = analyzeplaydrumbalance(
      playrender.samples,
      drumrender.samples,
      playrender.samplerate,
    )
    const gate = evalplaydrumbalancegate(balance)

    const summaryid = PLAY_DRUM_BALANCE_SCENARIO_ID
    const jsonpath = path.join(OUTDIR, `${summaryid}.json`)
    const txtpath = path.join(OUTDIR, `${summaryid}.txt`)

    for (const [stem, data] of [
      ['play', playrender] as const,
      ['drum', drumrender] as const,
    ]) {
      const basename = `${summaryid}-${stem}`
      fs.writeFileSync(
        path.join(OUTDIR, `${basename}.wav`),
        encodewavmono16(data.samples, data.samplerate),
      )
      fs.writeFileSync(
        path.join(OUTDIR, `${basename}.json`),
        JSON.stringify({ meta: data.meta, stem }, null, 2),
      )
    }

    fs.writeFileSync(
      jsonpath,
      JSON.stringify(
        {
          balance,
          gate: { pass: gate.pass, reasons: gate.reasons },
          playmeta: playrender.meta,
          drummeta: drumrender.meta,
        },
        null,
        2,
      ),
    )
    fs.writeFileSync(txtpath, formatplaydrumbalancereport(gate))

    console.log('')
    console.log(formatplaydrumbalancereport(gate))
    console.log('')
    console.log(`JSON: ${jsonpath}`)
    console.log(`TXT:  ${txtpath}`)
  } finally {
    await browser.close()
    await stopparityvite(parity)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
