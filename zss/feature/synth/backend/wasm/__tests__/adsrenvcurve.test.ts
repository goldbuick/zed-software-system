/**
 * ZssLinearEnv port tests + committed Tone sustain reference fixture.
 * Linear vs exponential envelopes differ in sustain level (~10+ dB); full
 * Tone-vs-Daisy gates live in `yarn env-parity:test` (amsaw + env config).
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  ENV_PARITY_ADSR_SEC,
  ZssLinearEnv,
  defaultenvparityparams,
  renderzssenvparitysignal,
} from 'zss/feature/synth/backend/wasm/adsrenvcurve'
import type { LEVEL_STABILITY_METRICS } from 'zss/feature/synth/backend/wasm/levelstabilitymetrics'
import { analyzelevelstability } from 'zss/feature/synth/backend/wasm/levelstabilitymetrics'
import { tonenotationseconds } from 'zss/feature/synth/playnotation'

const SAMPLERATE = 44100
const WINDOW_MS = 46

const FIXTURE_PATH = path.join(
  __dirname,
  '../__fixtures__/adsrenvcurve-tone-metrics.json',
)

type ADSR_CURVE_FIXTURE = {
  tone: LEVEL_STABILITY_METRICS
  sustain: { peakdb: number; rmsdb: number }
}

function loadfixture(): ADSR_CURVE_FIXTURE {
  const raw = readFileSync(FIXTURE_PATH, 'utf8')
  return JSON.parse(raw) as ADSR_CURVE_FIXTURE
}

function runenvtolevel(
  env: ZssLinearEnv,
  gatesamples: number,
  totalsamples: number,
): number {
  let last = 0
  for (let i = 0; i < totalsamples; i++) {
    last = env.process(i < gatesamples)
  }
  return last
}

describe('ZssLinearEnv', () => {
  it('resets level to 0 on rising gate', () => {
    const env = new ZssLinearEnv(SAMPLERATE)
    env.setparams(defaultenvparityparams())
    env.process(true)
    for (let i = 0; i < 10; i++) {
      env.process(true)
    }
    expect(env.process(true)).toBeLessThan(0.5)
  })

  it('reaches unity in attack then decays to sustain while gated', () => {
    const env = new ZssLinearEnv(SAMPLERATE)
    env.setparams(defaultenvparityparams())
    const gatesamples = Math.round(2 * SAMPLERATE)
    let level = 0
    for (let i = 0; i < gatesamples; i++) {
      level = env.process(true)
    }
    expect(level).toBeCloseTo(ENV_PARITY_ADSR_SEC.sustain, 2)
  })

  it('returns to idle after release', () => {
    const env = new ZssLinearEnv(SAMPLERATE)
    env.setparams(defaultenvparityparams())
    const gatesamples = Math.round(0.5 * SAMPLERATE)
    const releasehold = Math.round(ENV_PARITY_ADSR_SEC.release * SAMPLERATE * 8)
    const totalsamples = gatesamples + releasehold + 100
    const level = runenvtolevel(env, gatesamples, totalsamples)
    expect(level).toBeLessThan(1e-4)
  })
})

describe('adsrenvcurve tone fixture', () => {
  const gatesec = tonenotationseconds('2n')
  const totalsec = gatesec + ENV_PARITY_ADSR_SEC.release + 0.5

  it('loads committed Tone offline reference metrics', () => {
    const fixture = loadfixture()
    expect(fixture.tone.overallpeakdb).toBeGreaterThan(-20)
    expect(fixture.sustain.peakdb).toBeLessThan(0)
  })

  it('renders finite C4 sine × linear envelope for offline parity', () => {
    const zss = renderzssenvparitysignal(gatesec, totalsec, SAMPLERATE)
    const metrics = analyzelevelstability(zss, SAMPLERATE, WINDOW_MS)
    expect(metrics.overallpeakdb).toBeGreaterThan(-50)
    expect(metrics.steadypeakrangeDb).toBeLessThan(20)
  })
})
