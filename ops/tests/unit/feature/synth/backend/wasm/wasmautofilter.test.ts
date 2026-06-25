import {
  WASM_AUTOFILTER_DEFAULT_BASE_FREQ,
  WASM_AUTOFILTER_DEFAULT_DEPTH,
  WASM_AUTOFILTER_DEFAULT_FREQUENCY,
  WASM_AUTOFILTER_DEFAULT_OCTAVES,
  WASM_AUTOFILTER_DEFAULT_Q,
  WASM_AUTOFILTER_TYPE,
  autofiltercutoffhz,
  autofilterlfophase,
  autofiltermaxhz,
  autofiltersine,
  parseautofiltertype,
} from 'zss/feature/synth/backend/wasm/wasmautofilter'

describe('wasmautofilter', () => {
  it('maps LFO sine and depth to cutoff range like Tone AutoFilter', () => {
    const sr = 48000
    expect(autofiltercutoffhz(-1, 200, 5, 1, sr)).toBeCloseTo(200, 0)
    expect(autofiltercutoffhz(1, 200, 5, 1, sr)).toBeCloseTo(6400, 0)
    expect(autofiltercutoffhz(0, 200, 5, 0.5, sr)).toBeCloseTo(3300, 0)
  })

  it('caps sweep max at nyquist', () => {
    const sr = 48000
    expect(autofiltermaxhz(200, 5, sr)).toBe(6400)
    expect(autofiltermaxhz(10000, 5, sr)).toBe(sr * 0.5)
  })

  it('advances LFO phase by frequency over sample rate', () => {
    const sr = 48000
    const next = autofilterlfophase(0, 3, sr)
    expect(next).toBeCloseTo((6.28318530718 * 3) / sr, 8)
  })

  it('parses filter type names', () => {
    expect(parseautofiltertype('lowpass')).toBe(WASM_AUTOFILTER_TYPE.LOWPASS)
    expect(parseautofiltertype('bandpass')).toBe(WASM_AUTOFILTER_TYPE.BANDPASS)
    expect(parseautofiltertype('notch')).toBe(WASM_AUTOFILTER_TYPE.NOTCH)
    expect(parseautofiltertype('invalid')).toBeUndefined()
  })

  it('uses ZSS reset defaults', () => {
    expect(WASM_AUTOFILTER_DEFAULT_FREQUENCY).toBe(3)
    expect(WASM_AUTOFILTER_DEFAULT_DEPTH).toBe(0.5)
    expect(WASM_AUTOFILTER_DEFAULT_BASE_FREQ).toBe(200)
    expect(WASM_AUTOFILTER_DEFAULT_OCTAVES).toBe(5)
    expect(WASM_AUTOFILTER_DEFAULT_Q).toBe(1)
    expect(autofiltersine(0)).toBe(0)
  })
})
