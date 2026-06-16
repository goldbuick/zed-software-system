import {
  codeunitoffsettocellindex,
  graphemelength,
  graphemes,
} from 'zss/mapping/grapheme'

describe('grapheme', () => {
  it('graphemelength counts grapheme clusters', () => {
    expect(graphemelength('')).toBe(0)
    expect(graphemelength('a')).toBe(1)
    expect(graphemelength('e\u0301')).toBe(1)
  })

  it('graphemes yields each grapheme cluster', () => {
    expect([...graphemes('ab')]).toEqual(['a', 'b'])
  })

  it('codeunitoffsettocellindex maps offset to cell index', () => {
    expect(codeunitoffsettocellindex('hello', 0)).toBe(0)
    expect(codeunitoffsettocellindex('hello', 5)).toBe(5)
  })
})
