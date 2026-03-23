import { romhintfrommarkdown } from '../romhint'

describe('romhintfrommarkdown', () => {
  it('reads JSON-quoted hint from front matter', () => {
    const md = `---
hint: "$DKGRAYread text"
---
`
    expect(romhintfrommarkdown(md)).toBe('$DKGRAYread text')
  })

  it('reads unquoted hint scalar', () => {
    const md = `---
hint: simple line
---
`
    expect(romhintfrommarkdown(md)).toBe('simple line')
  })

  it('reads single-quoted hint', () => {
    const md = `---
hint: 'with '' quote'
---
`
    expect(romhintfrommarkdown(md)).toBe("with ' quote")
  })

  it('returns undefined when hint key missing', () => {
    const md = `---
other: "x"
---
`
    expect(romhintfrommarkdown(md)).toBeUndefined()
  })

  it('falls back to legacy desc; first line', () => {
    expect(romhintfrommarkdown('desc;legacy hint')).toBe('legacy hint')
  })

  it('returns undefined for non-ROM markdown without desc', () => {
    expect(romhintfrommarkdown('# hello\n\nbody')).toBeUndefined()
  })
})
