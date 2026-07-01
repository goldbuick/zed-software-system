import { ENV_PARITY_ADSR_SEC } from 'zss/feature/synth/backend/wasm/adsrenvcurve'
import { rendertoneenvelopeoffline } from 'zss/feature/synth/backend/wasm/adsrenvcurvetone'
import type { LEVEL_STABILITY_METRICS } from 'zss/feature/synth/backend/wasm/levelstabilitymetrics'
import { analyzelevelstability } from 'zss/feature/synth/backend/wasm/levelstabilitymetrics'
import { tonenotationseconds } from 'zss/feature/synth/playnotation'

export async function runadsrenvcurveregen(): Promise<{
  tone: LEVEL_STABILITY_METRICS
  sustain: { peakdb: number; rmsdb: number }
}> {
  const gatesec = tonenotationseconds('2n')
  const totalsec = gatesec + ENV_PARITY_ADSR_SEC.release + 0.5
  const samples = await rendertoneenvelopeoffline(gatesec, totalsec, 44100)
  const metrics = analyzelevelstability(samples, 44100, 46)
  const attackdecaysec = 0.03 + 0.2 + 0.02
  const start = Math.floor(attackdecaysec * 44100)
  const end = Math.floor((gatesec - 0.05) * 44100)
  let sumsq = 0
  let peak = 0
  const count = Math.max(0, end - start)
  for (let i = start; i < end; i++) {
    const s = samples[i]
    sumsq += s * s
    const abs = s < 0 ? -s : s
    if (abs > peak) {
      peak = abs
    }
  }
  const rms = count > 0 ? Math.sqrt(sumsq / count) : 0
  const sustain = {
    peakdb: peak > 0 ? 20 * Math.log10(peak) : -120,
    rmsdb: rms > 0 ? 20 * Math.log10(rms) : -120,
  }
  return { tone: metrics, sustain }
}
