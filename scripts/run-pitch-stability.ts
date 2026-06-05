/**
 * Offline render for pitch-stability scenario → WAV + pitch metrics JSON.
 *
 * Usage:
 *   yarn render:pitch-stability
 *
 * Outputs:
 *   cafe/public/renders/pitch-stability-c4-8n.wav
 *   cafe/public/renders/pitch-stability-c4-8n.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

import {
  analyzepitchstability,
  evalpitchstabilitygate,
  formatpitchstabilityreport,
} from '../zss/feature/synth/backend/daisy/pitchstability.ts'
import {
  PITCH_STABILITY_EXPECTED_PITCH,
  PITCH_STABILITY_SCENARIO_ID,
  pitchstabilityattacktimes,
  pitchstabilityscenario,
} from '../zss/feature/synth/backend/daisy/pitchstabilityscenario.ts'

import { startparityvite, stopparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const PORT = 9883
const OUTDIR = path.join(PROJECT, 'cafe/public/renders')
const HOST_URL = `http://127.0.0.1:${PORT}/offline-render-host.html`

type RENDER_PAYLOAD = {
  meta: {
    scenarioid: string
    rendersec: number
    samplerate: number
    samplecount: number
  }
  wavbase64: string
  report: string
}

async function renderpass(
  page: import('@playwright/test').Page,
): Promise<{ samples: Float32Array; samplerate: number; report: string }> {
  return page.evaluate(async () => {
    const { renderdaisysongpayload } =
      await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
    const { pitchstabilityscenario } =
      await import('/zss/feature/synth/backend/daisy/pitchstabilityscenario.ts')
    const {
      analyzepitchstability,
      evalpitchstabilitygate,
      formatpitchstabilityreport,
    } = await import('/zss/feature/synth/backend/daisy/pitchstability.ts')
    const { pitchstabilityattacktimes, PITCH_STABILITY_EXPECTED_PITCH } =
      await import('/zss/feature/synth/backend/daisy/pitchstabilityscenario.ts')

    console.warn('[pitch-stability] booting daisy wasm…')
    const scenario = pitchstabilityscenario()
    const payload = await renderdaisysongpayload(scenario)
    console.warn('[pitch-stability] render complete')

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

    const attacks = pitchstabilityattacktimes()
    const pitchmetrics = analyzepitchstability(
      samples,
      samplerate,
      attacks,
      PITCH_STABILITY_EXPECTED_PITCH,
    )
    const gate = evalpitchstabilitygate(pitchmetrics)
    const pitchreport = formatpitchstabilityreport(scenario.id, gate)

    return {
      samples,
      samplerate,
      report: `${payload.report}\n\n${pitchreport}`,
      pitchmetrics,
      gate,
      meta: payload.meta,
    }
  })
}

async function main() {
  fs.mkdirSync(OUTDIR, { recursive: true })

  const parity = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch()

  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(600_000)
    page.on('console', (msg) => {
      const text = msg.text()
      if (
        text.startsWith('[pitch-stability]') ||
        text.startsWith('[daisy boot]') ||
        text.startsWith('[daisy render]')
      ) {
        console.log(text)
      }
    })

    await page.goto(HOST_URL, { waitUntil: 'domcontentloaded' })
    console.log(`Rendering ${PITCH_STABILITY_SCENARIO_ID}…`)

    const result = await renderpass(page)
    await page.close()

    const basename = PITCH_STABILITY_SCENARIO_ID
    const wavpath = path.join(OUTDIR, `${basename}.wav`)
    const jsonpath = path.join(OUTDIR, `${basename}.json`)
    const txtpath = path.join(OUTDIR, `${basename}.txt`)

    const evaluated = result as {
      samples: Float32Array
      samplerate: number
      report: string
      pitchmetrics: ReturnType<typeof analyzepitchstability>
      gate: ReturnType<typeof evalpitchstabilitygate>
      meta: RENDER_PAYLOAD['meta']
    }

    const attacks = pitchstabilityattacktimes()
    const pitchmetrics =
      evaluated.pitchmetrics ??
      analyzepitchstability(
        evaluated.samples,
        evaluated.samplerate,
        attacks,
        PITCH_STABILITY_EXPECTED_PITCH,
      )
    const gate = evaluated.gate ?? evalpitchstabilitygate(pitchmetrics)

    const buffer = Buffer.alloc(44 + evaluated.samples.length * 2)
    const view = new DataView(buffer.buffer)
    const sr = evaluated.samplerate
    const write = (o: number, s: string) => {
      for (let i = 0; i < s.length; i++) {
        buffer[o + i] = s.charCodeAt(i)
      }
    }
    write(0, 'RIFF')
    view.setUint32(4, 36 + evaluated.samples.length * 2, true)
    write(8, 'WAVE')
    write(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sr, true)
    view.setUint32(28, sr * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    write(36, 'data')
    view.setUint32(40, evaluated.samples.length * 2, true)
    let off = 44
    for (let i = 0; i < evaluated.samples.length; i++) {
      const c = Math.max(-1, Math.min(1, evaluated.samples[i]))
      view.setInt16(off, c < 0 ? c * 0x8000 : c * 0x7fff, true)
      off += 2
    }
    fs.writeFileSync(wavpath, buffer)

    fs.writeFileSync(
      jsonpath,
      JSON.stringify(
        {
          meta: evaluated.meta,
          pitchmetrics,
          gate: { pass: gate.pass, reasons: gate.reasons },
        },
        null,
        2,
      ),
    )
    fs.writeFileSync(txtpath, evaluated.report)

    console.log('')
    console.log(evaluated.report)
    console.log('')
    console.log(`WAV:  ${wavpath}`)
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
