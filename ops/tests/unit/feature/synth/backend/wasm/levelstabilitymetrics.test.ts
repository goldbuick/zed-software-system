import {
  analyzelevelstability,
  comparelevelstability,
  formatlevelstabilityline,
  formatwindowcompareplot,
} from 'zss/feature/synth/backend/wasm/levelstabilitymetrics'

const SAMPLERATE = 44100

function rendersine(freq: number, sec: number, amp: number): Float32Array {
  const len = Math.ceil(sec * SAMPLERATE)
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    out[i] = amp * Math.sin((2 * Math.PI * freq * i) / SAMPLERATE)
  }
  return out
}

function renderamplitude(modhz: number, sec: number): Float32Array {
  const len = Math.ceil(sec * SAMPLERATE)
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLERATE
    const amp = 0.2 + 0.15 * Math.sin(2 * Math.PI * modhz * t)
    out[i] = amp * Math.sin(2 * Math.PI * 440 * t)
  }
  return out
}

describe('levelstabilitymetrics', () => {
  it('reports low peak range for steady sine', () => {
    const metrics = analyzelevelstability(
      rendersine(440, 1, 0.25),
      SAMPLERATE,
      46,
    )
    expect(metrics.peakrangeDb).toBeLessThan(1.5)
    expect(metrics.rmsrangeDb).toBeLessThan(1.5)
    expect(metrics.activewindows).toBeGreaterThan(5)
  })

  it('reports higher peak range for amplitude-modulated sine', () => {
    const steady = analyzelevelstability(
      rendersine(440, 1, 0.25),
      SAMPLERATE,
      46,
    )
    const modulated = analyzelevelstability(
      renderamplitude(8, 1),
      SAMPLERATE,
      46,
    )
    const delta = comparelevelstability(steady, modulated)
    expect(delta.steadypeakrangeDeltaDb).toBeGreaterThan(4)
    expect(delta.steadyrmsrangeDeltaDb).toBeGreaterThan(2)
  })

  it('formats a report line', () => {
    const metrics = analyzelevelstability(
      rendersine(440, 0.5, 0.1),
      SAMPLERATE,
      46,
    )
    const line = formatlevelstabilityline('test-scenario', metrics)
    expect(line).toContain('test-scenario')
    expect(line).toContain('spkΔ')
  })

  it('formats a side-by-side window compare plot', () => {
    const steady = analyzelevelstability(
      rendersine(440, 1, 0.25),
      SAMPLERATE,
      46,
    )
    const modulated = analyzelevelstability(
      renderamplitude(8, 1),
      SAMPLERATE,
      46,
    )
    const plot = formatwindowcompareplot(
      'steady',
      'modulated',
      steady,
      modulated,
      8,
    )
    expect(plot).toContain('steady vs modulated')
    expect(plot).toContain('dB')
  })
})
