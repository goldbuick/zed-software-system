import type { LEVEL_STABILITY_METRICS } from '../wasm/levelstabilitymetrics.ts'

export type SONG_COMPARE_RESULT = {
  daisyid: string
  toneid: string
  durationsec: number
  windowms: number
  peakdeltaDb: number
  rmsdeltaDb: number
  spreaddeltaDb: number
  medianwindowpeakdeltaDb: number
  p90windowpeakdeltaDb: number
  report: string
}

function timelinascii(
  peaksdb: number[],
  durationsec: number,
  windowms: number,
  cols = 60,
): string {
  const timeline = Array(cols).fill(' ')
  for (let c = 0; c < cols; c++) {
    const t0 = (c / cols) * durationsec
    const t1 = ((c + 1) / cols) * durationsec
    const slice = peaksdb.slice(
      Math.floor((t0 * 1000) / windowms),
      Math.ceil((t1 * 1000) / windowms),
    )
    if (slice.length === 0) {
      continue
    }
    const maxp = Math.max(...slice)
    if (maxp > -10) {
      timeline[c] = '#'
    } else if (maxp > -20) {
      timeline[c] = '='
    } else if (maxp > -35) {
      timeline[c] = '-'
    } else if (maxp > -50) {
      timeline[c] = '.'
    }
  }
  return timeline.join('')
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(p * sorted.length)),
  )
  return sorted[idx]
}

export function comparesongmetrics(
  daisyid: string,
  toneid: string,
  daisy: LEVEL_STABILITY_METRICS,
  tone: LEVEL_STABILITY_METRICS,
  durationsec: number,
): SONG_COMPARE_RESULT {
  const windowcount = Math.min(
    daisy.windowpeaksDb.length,
    tone.windowpeaksDb.length,
  )
  const windowdeltas: number[] = []
  for (let i = 0; i < windowcount; i++) {
    windowdeltas.push(daisy.windowpeaksDb[i] - tone.windowpeaksDb[i])
  }

  const peakdelta = daisy.overallpeakdb - tone.overallpeakdb
  const rmsdelta = daisy.overallrmsdb - tone.overallrmsdb
  const spreaddelta = daisy.steadypeakrangeDb - tone.steadypeakrangeDb
  const medianwindowpeakdelta = percentile(windowdeltas, 0.5)
  const p90windowpeakdelta = percentile(windowdeltas, 0.9)

  const lines = [
    `Song compare: ${daisyid} vs ${toneid}`,
    `duration ${durationsec.toFixed(2)} s, window ${daisy.windowms} ms`,
    '',
    `                    peak      RMS       steady spk range`,
    `  Daisy            ${daisy.overallpeakdb.toFixed(1).padStart(6)} dBFS  ${daisy.overallrmsdb.toFixed(1).padStart(6)} dBFS  ${daisy.steadypeakrangeDb.toFixed(1)} dB`,
    `  Tone             ${tone.overallpeakdb.toFixed(1).padStart(6)} dBFS  ${tone.overallrmsdb.toFixed(1).padStart(6)} dBFS  ${tone.steadypeakrangeDb.toFixed(1)} dB`,
    `  delta (D−T)      ${peakdelta.toFixed(1).padStart(6)} dB    ${rmsdelta.toFixed(1).padStart(6)} dB    ${spreaddelta.toFixed(1)} dB`,
    `  window peak Δ    median ${medianwindowpeakdelta.toFixed(1)} dB   p90 ${p90windowpeakdelta.toFixed(1)} dB`,
    '',
    'Peak timeline (# >-10  = >-20  - >-35  . >-50):',
    `  Daisy: ${timelinascii(daisy.windowpeaksDb, durationsec, daisy.windowms)}`,
    `  Tone:  ${timelinascii(tone.windowpeaksDb, durationsec, tone.windowms)}`,
  ]

  return {
    daisyid,
    toneid,
    durationsec,
    windowms: daisy.windowms,
    peakdeltaDb: peakdelta,
    rmsdeltaDb: rmsdelta,
    spreaddeltaDb: spreaddelta,
    medianwindowpeakdeltaDb: medianwindowpeakdelta,
    p90windowpeakdeltaDb: p90windowpeakdelta,
    report: lines.join('\n'),
  }
}
