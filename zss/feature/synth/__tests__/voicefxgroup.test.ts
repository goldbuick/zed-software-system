import {
  canonicalvoicefxgroupindex,
  voiceindexfxgroup,
} from 'zss/feature/synth/voicefxgroup'

describe('voicefxgroup', () => {
  it('maps firmware fx indices to four buses', () => {
    expect(canonicalvoicefxgroupindex(0)).toBe(0)
    expect(canonicalvoicefxgroupindex(1)).toBe(1)
    expect(canonicalvoicefxgroupindex(2)).toBe(2)
    expect(canonicalvoicefxgroupindex(3)).toBe(3)
    expect(canonicalvoicefxgroupindex(-1)).toBe(0)
    expect(canonicalvoicefxgroupindex(9)).toBe(3)
  })

  it('maps voice indices to play pair and bgplay buses', () => {
    expect(voiceindexfxgroup(0)).toBe(0)
    expect(voiceindexfxgroup(1)).toBe(0)
    expect(voiceindexfxgroup(2)).toBe(1)
    expect(voiceindexfxgroup(3)).toBe(1)
    expect(voiceindexfxgroup(4)).toBe(2)
    expect(voiceindexfxgroup(7)).toBe(2)
  })
})
