import { SOURCE_TYPE } from 'zss/feature/synth/source'

import { generatenoisewave } from '../noisewave'

describe('noisewave', () => {
  it('generates deterministic retro noise samples', () => {
    const a = generatenoisewave(SOURCE_TYPE.RETRO_NOISE)
    const b = generatenoisewave(SOURCE_TYPE.RETRO_NOISE)
    expect(a.length).toBe(131072)
    expect(a[0]).toBe(b[0])
    expect(a[1000]).toBe(b[1000])
    expect(a[0]).toBeGreaterThanOrEqual(-1)
    expect(a[0]).toBeLessThanOrEqual(1)
  })

  it('uses different taps for buzz vs clang', () => {
    const buzz = generatenoisewave(SOURCE_TYPE.BUZZ_NOISE)
    const clang = generatenoisewave(SOURCE_TYPE.CLANG_NOISE)
    let diffs = 0
    for (let i = 0; i < 512; i++) {
      if (buzz[i] !== clang[i]) {
        diffs++
      }
    }
    expect(diffs).toBeGreaterThan(0)
  })
})
