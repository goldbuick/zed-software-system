import {
  SIDECHAIN_MAX_BYPASS_DUCK_DB,
  SIDECHAIN_MIN_DUCK_DEPTH_DB,
  evalsidechainparitygate,
} from 'zss/feature/synth/backend/daisy/sidechainparity'

describe('sidechainparity', () => {
  it('passes when SC on ducks and SC off does not', () => {
    const gate = evalsidechainparitygate({
      duckon: {
        duckdepthdb: 6,
        prepeakdb: -3,
        postpeakdb: -9,
        stabtime: 0.75,
      },
      duckoff: {
        duckdepthdb: 0.5,
        prepeakdb: -4,
        postpeakdb: -4.5,
        stabtime: 0.75,
      },
      abduckdepthdb: 7,
    })
    expect(gate.pass).toBe(true)
  })

  it('fails when bypass still ducks heavily', () => {
    const gate = evalsidechainparitygate({
      duckon: { duckdepthdb: 6, prepeakdb: -3, postpeakdb: -9, stabtime: 0.75 },
      duckoff: {
        duckdepthdb: 5,
        prepeakdb: -3,
        postpeakdb: -8,
        stabtime: 0.75,
      },
      abduckdepthdb: 1,
    })
    expect(gate.pass).toBe(false)
  })

  it('fails when SC on does not duck enough', () => {
    const gate = evalsidechainparitygate({
      duckon: { duckdepthdb: 1, prepeakdb: -5, postpeakdb: -6, stabtime: 0.75 },
      duckoff: {
        duckdepthdb: 0,
        prepeakdb: -5,
        postpeakdb: -5,
        stabtime: 0.75,
      },
      abduckdepthdb: 1,
    })
    expect(gate.pass).toBe(false)
  })

  it('uses documented thresholds', () => {
    expect(SIDECHAIN_MIN_DUCK_DEPTH_DB).toBe(4)
    expect(SIDECHAIN_MAX_BYPASS_DUCK_DB).toBe(2)
  })
})
