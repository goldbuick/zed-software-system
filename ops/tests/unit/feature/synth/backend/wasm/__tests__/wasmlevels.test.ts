import {
  NOISE_BASE_EXPRESSION,
  WASM_DRUM_BUS_DB,
  WASM_DRUM_BUS_GAIN,
  WASM_NOISE_VOICE_GAIN,
  WASM_SINE_VOICE_GAIN,
} from 'zss/feature/synth/backend/wasm/wasmlevels'

describe('wasmlevels', () => {
  it('matches Tone drumvolume bus gain', () => {
    expect(WASM_DRUM_BUS_DB).toBe(15)
    expect(WASM_DRUM_BUS_GAIN).toBeCloseTo(5.6234, 3)
  })

  it('boosts sine voices to square RMS level', () => {
    expect(WASM_SINE_VOICE_GAIN).toBeCloseTo(Math.SQRT2, 5)
  })

  it('targets square peak for retro chip noise', () => {
    const retroexpression = 0.25
    const peak = retroexpression * NOISE_BASE_EXPRESSION * WASM_NOISE_VOICE_GAIN
    expect(peak).toBeCloseTo(1, 0)
  })
})
