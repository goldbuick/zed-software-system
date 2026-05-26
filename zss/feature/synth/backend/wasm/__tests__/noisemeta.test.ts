import { SOURCE_TYPE } from 'zss/feature/synth/shared/sourcetype'

import { isnoisevoice, noisemetafor } from '../noisemeta'

describe('noisemeta', () => {
  it('maps BeepBox chip noise params', () => {
    const white = noisemetafor(SOURCE_TYPE.WHITE_NOISE)
    expect(white.pitchfiltermult).toBe(8)
    expect(white.issoft).toBe(true)
    expect(white.expression).toBe(1)

    const hollow = noisemetafor(SOURCE_TYPE.HOLLOW_NOISE)
    expect(hollow.basepitch).toBe(96)
    expect(hollow.expression).toBe(1.5)
  })

  it('uses clang-like params for metallic', () => {
    const metallic = noisemetafor(SOURCE_TYPE.METALLIC_NOISE)
    expect(metallic.expression).toBe(0.4)
    expect(metallic.pitchfiltermult).toBe(1024)
  })

  it('identifies noise voice types', () => {
    expect(isnoisevoice(SOURCE_TYPE.RETRO_NOISE)).toBe(true)
    expect(isnoisevoice(SOURCE_TYPE.WHITE_NOISE)).toBe(true)
    expect(isnoisevoice(SOURCE_TYPE.HOLLOW_NOISE)).toBe(true)
    expect(isnoisevoice(SOURCE_TYPE.SYNTH)).toBe(false)
    expect(isnoisevoice(SOURCE_TYPE.BELLS)).toBe(false)
  })
})
