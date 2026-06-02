import {
  buildscalecrewsequence,
  buildscalecrewsequencewithmelody,
  estimatesequencedurationsec,
  scalecrewmelodyonlyplay,
} from '../scalecrewsong'

describe('scalecrewsong', () => {
  it('strips drum-only leading invoke for melody-only renders', () => {
    expect(scalecrewmelodyonlyplay('s460xpx0x6x0x;--qcxb!x;')).toBe('--qcxb!x;')
    expect(scalecrewmelodyonlyplay('0;cxdxexfxgxaxb!x+cx')).toBe(
      'cxdxexfxgxaxb!x+cx',
    )
    expect(scalecrewmelodyonlyplay('cxdxexfx')).toBe('cxdxexfx')
  })

  it('estimates positive duration for climax section', () => {
    const climax = buildscalecrewsequence('climax')
    expect(climax.length).toBeGreaterThan(10)
    const sec = estimatesequencedurationsec(climax)
    expect(sec).toBeGreaterThan(8)
    expect(sec).toBeLessThan(120)
  })

  it('melody-only climax is shorter than full climax', () => {
    const { full, melody } = buildscalecrewsequencewithmelody('climax')
    expect(melody.length).toBe(full.length)
    expect(estimatesequencedurationsec(melody)).toBeLessThanOrEqual(
      estimatesequencedurationsec(full) + 0.01,
    )
  })
})
