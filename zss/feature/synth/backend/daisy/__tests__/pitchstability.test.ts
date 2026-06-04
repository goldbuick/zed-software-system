import {
  estimatefundamentalhz,
  evalpitchstabilitygate,
  goertzelmag,
  hztocents,
} from '../pitchstability'

function fillsine(
  hz: number,
  samplerate: number,
  durationsec: number,
  phase = 0,
): Float32Array {
  const len = Math.floor(durationsec * samplerate)
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    out[i] = Math.sin((2 * Math.PI * hz * i) / samplerate + phase)
  }
  return out
}

describe('pitchstability', () => {
  it('goertzel peaks at target frequency', () => {
    const sr = 44100
    const hz = 261.63
    const samples = fillsine(hz, sr, 0.05)
    const at = goertzelmag(samples, sr, hz)
    const off = goertzelmag(samples, sr, hz * 1.1)
    expect(at).toBeGreaterThan(off * 3)
  })

  it('estimatefundamentalhz recovers C4 within gate tolerance', () => {
    const sr = 44100
    const expected = 261.63
    const samples = fillsine(expected, sr, 0.04)
    const est = estimatefundamentalhz(samples, sr, expected, 50, 1)
    expect(Math.abs(hztocents(est / expected))).toBeLessThan(3)
  })

  it('gate fails when later notes are detuned by strike cents', () => {
    const ref = 261.63
    const strike16hz = ref * Math.pow(2, 16 / 1200)
    const gate = evalpitchstabilitygate({
      expectedhz: ref,
      notecount: 16,
      attacktimesec: [0, 0.25],
      estimatedhz: [ref, strike16hz],
      centdelta: [0, 16],
      maxcentdrift: 16,
      strikedriftrate: 16,
    })
    expect(gate.pass).toBe(false)
  })

  it('gate passes when all notes match reference', () => {
    const ref = 261.63
    const gate = evalpitchstabilitygate({
      expectedhz: ref,
      notecount: 16,
      attacktimesec: Array.from({ length: 16 }, (_, i) => i * 0.25),
      estimatedhz: Array(16).fill(ref),
      centdelta: Array(16).fill(0),
      maxcentdrift: 0,
      strikedriftrate: 0,
    })
    expect(gate.pass).toBe(true)
  })

  it('gate passes when drift is harmonic noise not strike slope', () => {
    const ref = 261.63
    const centdelta = [0, 5, -1, 4, 0, 2, 3, 5, -1, 5, -1, 8, 5, -1, 8, 5]
    const gate = evalpitchstabilitygate({
      expectedhz: ref,
      notecount: 16,
      attacktimesec: Array.from({ length: 16 }, (_, i) => i * 0.25),
      estimatedhz: centdelta.map((c) => ref * Math.pow(2, c / 1200)),
      centdelta,
      maxcentdrift: 8,
      strikedriftrate: 5 / 15,
    })
    expect(gate.pass).toBe(true)
  })
})
