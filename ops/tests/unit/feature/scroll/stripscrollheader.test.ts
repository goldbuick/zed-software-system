import {
  readscrollcodepagebody,
  scrollsourceisscrollcodepage,
  stripscrollcodepageheader,
} from 'zss/feature/scroll/stripscrollheader'

describe('stripscrollcodepageheader', () => {
  it('detects scroll codepages', () => {
    expect(scrollsourceisscrollcodepage('@scroll notes\nhello')).toBe(true)
    expect(scrollsourceisscrollcodepage('@board title')).toBe(false)
  })

  it('strips header and leading blank lines', () => {
    const source = '@scroll notes\n\n# heading\nbody'
    expect(stripscrollcodepageheader(source)).toBe('# heading\nbody')
  })

  it('reads body from scroll codepage', () => {
    const body = readscrollcodepagebody({
      id: 'sid_1',
      code: '@scroll notes\nhello',
    })
    expect(body).toBe('hello')
  })

  it('returns undefined for non-scroll codepage', () => {
    const body = readscrollcodepagebody({
      id: 'sid_1',
      code: '@board title',
    })
    expect(body).toBeUndefined()
  })
})
