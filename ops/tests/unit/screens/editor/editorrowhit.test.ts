import { cellindextocodeunitoffset } from 'zss/mapping/grapheme'
import { editorrowhitcursor } from 'zss/screens/editor/editorinputhelpers'
import { splitcoderows } from 'zss/screens/tape/common'

const edge = { left: 0, top: 0, bottom: 20 }

describe('editorrowhitcursor', () => {
  const rows = splitcoderows('abcd\nxy\n')

  it('places row 0 at edge.top + 2 when yscroll is 0', () => {
    expect(editorrowhitcursor(5, 2, edge, 0, 0, false, rows)).toBe(0)
    expect(editorrowhitcursor(7, 2, edge, 0, 0, false, rows)).toBe(2)
  })

  it('maps a scrolled row', () => {
    expect(editorrowhitcursor(5, 2, edge, 0, 1, false, rows)).toBe(5)
    expect(editorrowhitcursor(6, 2, edge, 0, 1, false, rows)).toBe(6)
  })

  it('lands a gutter tap at the start of the line', () => {
    expect(editorrowhitcursor(1, 2, edge, 0, 0, false, rows)).toBe(0)
    expect(editorrowhitcursor(4, 2, edge, 0, 0, false, rows)).toBe(0)
  })

  it('clamps a column past the line end', () => {
    expect(editorrowhitcursor(80, 2, edge, 0, 0, false, rows)).toBe(4)
  })

  it('returns undefined for a title or find-bar tap', () => {
    expect(editorrowhitcursor(5, 1, edge, 0, 0, false, rows)).toBeUndefined()
    expect(editorrowhitcursor(5, 0, edge, 0, 0, false, rows)).toBeUndefined()
    const short = { left: 0, top: 0, bottom: 5 }
    expect(editorrowhitcursor(5, 4, short, 0, 0, true, rows)).toBeUndefined()
    expect(editorrowhitcursor(5, 4, short, 0, 0, false, rows)).toBe(8)
  })

  it('maps a wide character by grapheme cell', () => {
    const wide = splitcoderows('a\u{1F44D}b\n')
    expect(cellindextocodeunitoffset('a\u{1F44D}b', 1)).toBe(1)
    expect(cellindextocodeunitoffset('a\u{1F44D}b', 2)).toBe(3)
    expect(editorrowhitcursor(6, 2, edge, 0, 0, false, wide)).toBe(1)
    expect(editorrowhitcursor(7, 2, edge, 0, 0, false, wide)).toBe(3)
  })
})
