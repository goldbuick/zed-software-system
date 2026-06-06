import {
  evalnotepopgates,
  notepoppopwindowindex,
} from 'zss/feature/synth/backend/daisy/notepopgates'
import type { LEVEL_STABILITY_METRICS } from 'zss/feature/synth/backend/wasm/levelstabilitymetrics'

const META = {
  gateboundariessec: [0, 0.441, 0.882, 1.324, 1.765, 2.206, 2.647, 3.088],
}

function basemetrics(windowpeaksDb: number[]): LEVEL_STABILITY_METRICS {
  return {
    windows: windowpeaksDb.length,
    windowms: 46,
    activewindows: windowpeaksDb.filter((db) => db > -60).length,
    silentwindows: 0,
    peakrangeDb: 0,
    rmsrangeDb: 0,
    peakstdDb: 0,
    rmsstdDb: 0,
    creststdDb: 0,
    overallpeakdb: Math.max(...windowpeaksDb),
    overallrmsdb: -30,
    windowpeaksDb,
    windowrmsDb: windowpeaksDb.map(() => -35),
    steadypeakrangeDb: 0,
    steadyrmsrangeDb: 0,
    steadypeakstdDb: 0,
    steadyrmsstdDb: 0,
    steadycwindows: 0,
  }
}

function fillwindows(peaks: Record<number, number>, count = 90): number[] {
  const out = new Array<number>(count).fill(-73)
  for (const [idx, peak] of Object.entries(peaks)) {
    out[Number(idx)] = peak
  }
  return out
}

describe('notepopgates', () => {
  it('maps note-on pop offset to expected 46 ms window index', () => {
    expect(notepoppopwindowindex(0, 46)).toBe(1)
    expect(notepoppopwindowindex(0.882, 46)).toBe(20)
  })

  it('fails render_sanity when comp-off is nearly silent', () => {
    const silent = basemetrics(fillwindows({ 1: -64 }))
    const report = evalnotepopgates(
      { metrics: silent },
      { metrics: silent },
      META,
    )
    expect(report.pass).toBe(false)
    expect(
      report.failures.some((line) => line.startsWith('render_sanity')),
    ).toBe(true)
  })

  it('fails pre-fix comp-on pop spikes hotter than comp-off', () => {
    const popidx = notepoppopwindowindex(0, 46)
    const compoff = basemetrics(
      fillwindows({
        [popidx]: -6,
        20: -6,
        39: -6,
        58: -6,
      }),
    )
    compoff.overallpeakdb = -6
    const compon = basemetrics(
      fillwindows({
        [popidx]: -2.1,
        20: -2.2,
        39: -2.1,
        58: -2.1,
      }),
    )
    compon.overallpeakdb = -2.1

    const report = evalnotepopgates(
      { metrics: compon },
      { metrics: compoff },
      META,
    )
    expect(report.pass).toBe(false)
    expect(
      report.failures.some((line) => line.startsWith('noteon_pop_spike')),
    ).toBe(true)
  })

  it('passes when comp-on does not spike hotter than comp-off at pop windows', () => {
    const popidx = notepoppopwindowindex(0, 46)
    const compoff = basemetrics(
      fillwindows({
        [popidx]: -3,
        20: -2.2,
        39: -2.1,
        58: -3.6,
      }),
    )
    compoff.overallpeakdb = -2.1
    const compon = basemetrics(
      fillwindows({
        [popidx]: -6.5,
        20: -5.7,
        39: -5.7,
        58: -6.4,
      }),
    )
    compon.overallpeakdb = -5.7

    const report = evalnotepopgates(
      { metrics: compon },
      { metrics: compoff },
      META,
    )
    expect(report.pass).toBe(true)
  })
})
