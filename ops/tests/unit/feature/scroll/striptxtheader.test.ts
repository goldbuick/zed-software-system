import {
  readtxtcodepagebody,
  scrollsourceistxtcodepage,
  striptxtcodepageheader,
} from 'zss/feature/scroll/striptxtheader'

describe('striptxtcodepageheader', () => {
  it('detects txt codepages', () => {
    expect(scrollsourceistxtcodepage('@txt notes\nhello')).toBe(true)
    expect(scrollsourceistxtcodepage('@board title')).toBe(false)
    expect(scrollsourceistxtcodepage('@scroll notes\nhello')).toBe(false)
  })

  it('strips header and leading blank lines', () => {
    const source = '@txt notes\n\n# heading\nbody'
    expect(striptxtcodepageheader(source)).toBe('# heading\nbody')
  })

  it('reads body from txt codepage', () => {
    const body = readtxtcodepagebody({
      id: 'sid_1',
      code: '@txt notes\nhello',
    })
    expect(body).toBe('hello')
  })

  it('returns undefined for non-txt codepage', () => {
    const body = readtxtcodepagebody({
      id: 'sid_1',
      code: '@board title',
    })
    expect(body).toBeUndefined()
  })
})
