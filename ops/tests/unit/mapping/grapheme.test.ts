import {
  codeunitoffsettocellindex,
  graphemecellindex,
  graphemelength,
  graphemes,
} from 'zss/mapping/grapheme'

describe('grapheme', () => {
  it('graphemelength counts grapheme clusters', () => {
    expect(graphemelength('')).toBe(0)
    expect(graphemelength('a')).toBe(1)
    expect(graphemelength('hello')).toBe(5)
    expect(graphemelength('e\u0301')).toBe(1)
    expect(graphemelength('\n')).toBe(1)
    expect(graphemelength('\r\n')).toBe(1)
  })

  it('graphemes yields each grapheme cluster', () => {
    expect([...graphemes('ab')]).toEqual(['a', 'b'])
    expect([...graphemes('e\u0301')]).toEqual(['e\u0301'])
    expect([...graphemes('\r\n')]).toEqual(['\r\n'])
  })

  it('codeunitoffsettocellindex maps offset to cell index', () => {
    expect(codeunitoffsettocellindex('hello', 0)).toBe(0)
    expect(codeunitoffsettocellindex('hello', 3)).toBe(3)
    expect(codeunitoffsettocellindex('hello', 5)).toBe(5)
    expect(codeunitoffsettocellindex('e\u0301', 0)).toBe(0)
    expect(codeunitoffsettocellindex('e\u0301', 1)).toBe(1)
    expect(codeunitoffsettocellindex('e\u0301', 2)).toBe(1)
    expect(codeunitoffsettocellindex('\r\n', 0)).toBe(0)
    expect(codeunitoffsettocellindex('\r\n', 1)).toBe(1)
    expect(codeunitoffsettocellindex('\r\n', 2)).toBe(1)
  })

  it('graphemecellindex matches codeunitoffsettocellindex for every offset', () => {
    for (const line of ['hello', 'e\u0301x']) {
      const cellindex = graphemecellindex(line)
      for (let offset = 0; offset <= line.length; ++offset) {
        expect(cellindex(offset)).toBe(codeunitoffsettocellindex(line, offset))
      }
    }
  })
})
