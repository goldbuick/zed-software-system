#!/usr/bin/env npx tsx
/**
 * Regenerate WASM/Tone parity reference metrics.
 *
 * WASM (browser stack): ZSS_PARITY_RENDER=1 in a browser harness — or run via dev server.
 * Tone reference: requires `tone` devDependency and Web Audio (see package.json script).
 *
 * Usage:
 *   yarn regen:parity-fixtures
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  WASM_PARITY_PATCHES,
  type PARITY_PATCH,
} from '../zss/feature/synth/backend/wasm/paritypatches.ts'
import type { PARITY_AUDIO_METRICS } from '../zss/feature/synth/backend/wasm/paritymetrics.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(
  ROOT,
  '../zss/feature/synth/backend/wasm/__fixtures__/parity-metrics.json',
)

async function rendertonepatch(
  patch: PARITY_PATCH,
): Promise<PARITY_AUDIO_METRICS | undefined> {
  try {
    const tone = await import('tone')
    const { Offline, Synth, FMSynth, MembraneSynth, start } = tone
    await start()
    const duration = patch.durationsec
    const buffer = await Offline(async () => {
      const name = patch.voiceconfig
      if (name === 'bells') {
        const synth = new FMSynth().toDestination()
        synth.triggerAttackRelease('C4', duration * 0.85, 0)
        return
      }
      if (name === 'doot') {
        const synth = new MembraneSynth().toDestination()
        synth.triggerAttackRelease('C4', duration * 0.85, 0)
        return
      }
      if (name.startsWith('algo')) {
        const synth = new Synth({ oscillator: { type: 'sine' } }).toDestination()
        synth.triggerAttackRelease('C4', duration * 0.85, 0)
        return
      }
      const synth = new Synth({
        oscillator: { type: name as 'sine' },
      }).toDestination()
      synth.triggerAttackRelease('C4', duration * 0.85, 0)
    }, duration)
    const ch = buffer.getChannelData(0)
    let sumsq = 0
    let peak = 0
    for (let i = 0; i < ch.length; i++) {
      sumsq += ch[i] * ch[i]
      const abs = ch[i] < 0 ? -ch[i] : ch[i]
      if (abs > peak) {
        peak = abs
      }
    }
    const rms = Math.sqrt(sumsq / ch.length)
    return {
      rmsdb: rms > 0 ? 20 * Math.log10(rms) : -120,
      peakdb: peak > 0 ? 20 * Math.log10(peak) : -120,
      length: ch.length,
      samplerate: buffer.sampleRate,
    }
  } catch {
    return undefined
  }
}

async function main() {
  const patches: Record<string, PARITY_AUDIO_METRICS> = {}
  for (const patch of WASM_PARITY_PATCHES) {
    const tone = await rendertonepatch(patch)
    if (tone) {
      patches[patch.id] = tone
      console.log(`tone ${patch.id}`, tone)
    } else {
      console.warn(`skip ${patch.id} — tone or Web Audio unavailable`)
    }
  }
  if (Object.keys(patches).length === 0) {
    console.error('No patches rendered — install tone and run in a Web Audio environment.')
    process.exit(1)
  }
  writeFileSync(OUT, `${JSON.stringify({ patches }, null, 2)}\n`)
  console.log(`wrote ${OUT}`)
}

void main()
