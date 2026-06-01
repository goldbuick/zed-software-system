import {
  WASM_AUTOWAH_DEFAULT_BASE_FREQ,
  WASM_AUTOWAH_DEFAULT_FOLLOWER,
  WASM_AUTOWAH_DEFAULT_GAIN,
  WASM_AUTOWAH_DEFAULT_OCTAVES,
  WASM_AUTOWAH_DEFAULT_SENSITIVITY,
  autowahfollowerstep,
  autowahinputboost,
  autowahmaxhz,
  autowahsweephz,
} from '../wasmautowah'

describe('wasmautowah', () => {
  it('maps sensitivity dB to input boost like Tone AutoWah', () => {
    expect(autowahinputboost(0)).toBeCloseTo(1, 6)
    expect(autowahinputboost(-30)).toBeCloseTo(31.622776, 3)
  })

  it('sweeps from base frequency across octaves with sqrt follower curve', () => {
    const sr = 48000
    expect(autowahsweephz(0, 100, 6, sr)).toBe(100)
    expect(autowahsweephz(1, 100, 6, sr)).toBeCloseTo(6400, 0)
    expect(autowahsweephz(0.25, 100, 6, sr)).toBeCloseTo(
      100 + (6400 - 100) * 0.5,
      0,
    )
  })

  it('caps sweep max at nyquist', () => {
    const sr = 48000
    expect(autowahmaxhz(100, 6, sr)).toBe(6400)
    expect(autowahmaxhz(10000, 6, sr)).toBe(sr * 0.5)
  })

  it('steps follower toward abs sample times boost', () => {
    const next = autowahfollowerstep(0, 0.5, 0, 0.2, 48000)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(0.5)
  })

  it('uses Tone default constants', () => {
    expect(WASM_AUTOWAH_DEFAULT_BASE_FREQ).toBe(100)
    expect(WASM_AUTOWAH_DEFAULT_OCTAVES).toBe(6)
    expect(WASM_AUTOWAH_DEFAULT_SENSITIVITY).toBe(0)
    expect(WASM_AUTOWAH_DEFAULT_GAIN).toBe(0)
    expect(WASM_AUTOWAH_DEFAULT_FOLLOWER).toBe(0.2)
  })
})
