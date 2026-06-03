/**
 * Find Daisy voice volume (dB) for pixel-identical absolute peak timeline on +icdeg.
 *
 * Usage: npx tsx scripts/calibrate-env-parity-timeline.ts
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

import { startparityvite, stopparityvite } from './parity-vite-server.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const PORT = 9887

function monobuffer(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0)
  }
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  const mono = new Float32Array(left.length)
  for (let i = 0; i < left.length; i++) {
    mono[i] = (left[i] + right[i]) * 0.5
  }
  return mono
}

async function main() {
  const parity = await startparityvite(PROJECT, PORT)
  const browser = await chromium.launch()

  try {
    const baspage = await browser.newPage()
    await baspage.goto(`http://127.0.0.1:${PORT}/level-stability.html`, {
      waitUntil: 'domcontentloaded',
    })
    const toneref = await baspage.evaluate(async () => {
      const { rendertonelevelscenario } = await import(
        '/zss/feature/synth/backend/wasm/toneparityrender.ts'
      )
      const { envparityretriggerscenario } = await import(
        '/zss/feature/synth/backend/daisy/envparityscenario.ts'
      )
      const { analyzelevelstability } = await import(
        '/zss/feature/synth/backend/wasm/levelstabilitymetrics.ts'
      )
      const { timelinascii } = await import(
        '/zss/feature/synth/backend/daisy/envparityrender.ts'
      )
      const scenario = envparityretriggerscenario()
      const buffer = await rendertonelevelscenario(scenario)
      const left = buffer.getChannelData(0)
      const right =
        buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left
      const mono = new Float32Array(left.length)
      for (let i = 0; i < left.length; i++) {
        mono[i] = (left[i] + right[i]) * 0.5
      }
      const tone = analyzelevelstability(mono, buffer.sampleRate, 46)
      return {
        line: timelinascii(tone.windowpeaksDb, 2.5, tone.windowms),
        peak: tone.overallpeakdb,
      }
    })
    await baspage.close()
    console.log('Tone target:', toneref.line)
    console.log('Tone peak:', toneref.peak.toFixed(1), 'dBFS')

    for (let vol = -4; vol <= 6; vol += 0.1) {
      const page = await browser.newPage()
      await page.goto(`http://127.0.0.1:${PORT}/level-stability.html`, {
        waitUntil: 'domcontentloaded',
      })
      const result = await page.evaluate(
        async ({ voicedb, toneline }) => {
          const { renderdaisylevelscenario } = await import(
            '/zss/feature/synth/backend/daisy/daisylevelrender.ts'
          )
          const { envparityretriggerscenario } = await import(
            '/zss/feature/synth/backend/daisy/envparityscenario.ts'
          )
          const { analyzelevelstability } = await import(
            '/zss/feature/synth/backend/wasm/levelstabilitymetrics.ts'
          )
          const { timelinascii } = await import(
            '/zss/feature/synth/backend/daisy/envparityrender.ts'
          )
          const scenario = envparityretriggerscenario()
          scenario.voiceconfigs = [
            ...(scenario.voiceconfigs ?? []),
            ['volume', voicedb],
          ]
          const render = await renderdaisylevelscenario(scenario)
          const daisy = analyzelevelstability(
            render.samples,
            render.samplerate,
            46,
          )
          const daisyline = timelinascii(
            daisy.windowpeaksDb,
            render.rendersec,
            daisy.windowms,
          )
          return { daisyline, peak: daisy.overallpeakdb, match: daisyline === toneline }
        },
        { voicedb: vol, toneline: toneref.line },
      )
      await page.close()

      if (result.match) {
        console.log(`\nEXACT MATCH at voice volume ${vol.toFixed(2)} dB`)
        console.log(result.daisyline)
        return
      }
      const mismatches = [...result.daisyline].filter(
        (ch, i) => ch !== toneref.line[i],
      ).length
      if (mismatches <= 4) {
        console.log(
          `vol ${vol.toFixed(2)} mismatches=${mismatches} peak=${result.peak.toFixed(1)}`,
        )
        console.log(`  ${result.daisyline}`)
      }
    }
    console.log('\nNo exact match in search range.')
  } finally {
    await browser.close()
    await stopparityvite(parity)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
