import { SOURCE_TYPE } from 'zss/feature/synth/source'

import {
  NOISE_GOLDEN_BUZZ,
  NOISE_GOLDEN_CLANG,
  NOISE_GOLDEN_RETRO,
  NOISE_SAMPLE_COUNT,
  NOISE_TABLE_LENGTH,
  generatebuzzwave,
  generateclangwave,
  generatehollowwave,
  generatemetallicwave,
  generatenoisewave,
  generateretrowave,
  generatewhitewave,
} from '../noisewave'

function first16(wave: Float64Array) {
  return Array.from(wave.slice(0, 16))
}

describe('noisewave', () => {
  it('uses BeepBox 32768-sample tables with seam', () => {
    const retro = generateretrowave()
    expect(retro.length).toBe(NOISE_TABLE_LENGTH)
    expect(NOISE_SAMPLE_COUNT).toBe(32768)
    expect(retro[NOISE_SAMPLE_COUNT]).toBe(retro[0])
  })

  it('generates deterministic retro noise samples', () => {
    const a = generateretrowave()
    const b = generateretrowave()
    expect(a[0]).toBe(b[0])
    expect(a[1000]).toBe(b[1000])
    expect(first16(a)).toEqual(NOISE_GOLDEN_RETRO)
  })

  it('matches BeepBox LFSR golden vectors for clang and buzz', () => {
    expect(first16(generateclangwave())).toEqual(NOISE_GOLDEN_CLANG)
    expect(first16(generatebuzzwave())).toEqual(NOISE_GOLDEN_BUZZ)
  })

  it('uses different taps for buzz vs clang', () => {
    const buzz = generatebuzzwave()
    const clang = generateclangwave()
    let diffs = 0
    for (let i = 0; i < 512; i++) {
      if (buzz[i] !== clang[i]) {
        diffs++
      }
    }
    expect(diffs).toBeGreaterThan(0)
  })

  it('generates fixed-seed white noise', () => {
    const a = generatewhitewave()
    const b = generatewhitewave()
    expect(a[0]).toBeCloseTo(-0.999, 2)
    expect(a[0]).toBe(b[0])
    expect(a[500]).toBe(b[500])
  })

  it('generates deterministic metallic with fixed legacy amplitude', () => {
    const a = generatemetallicwave()
    const b = generatemetallicwave()
    expect(a[0]).toBe(22)
    expect(a[1]).toBe(-8)
    expect(a[0]).toBe(b[0])
  })

  it('generates hollow spectrum noise', () => {
    const hollow = generatehollowwave()
    expect(hollow.length).toBe(NOISE_TABLE_LENGTH)
    expect(hollow[NOISE_SAMPLE_COUNT]).toBe(hollow[0])
    expect(Math.abs(hollow[0])).toBeLessThan(2)
  })

  it('dispatches generatenoisewave by SOURCE_TYPE', () => {
    expect(generatenoisewave(SOURCE_TYPE.RETRO_NOISE)[0]).toBe(1)
    expect(generatenoisewave(SOURCE_TYPE.WHITE_NOISE)[0]).toBeCloseTo(-0.999, 2)
    expect(generatenoisewave(SOURCE_TYPE.HOLLOW_NOISE)[0]).toBeCloseTo(0.559, 2)
  })
})
