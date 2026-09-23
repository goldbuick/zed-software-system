import {
  editorfindmatchindex,
  editorfindmatches,
  editorfindnext,
  editorfindprev,
  editorreplaceall,
  editorreplaceat,
} from 'zss/screens/editor/editorfind'

describe('editorfindmatches', () => {
  it('returns empty for empty query', () => {
    expect(editorfindmatches('hello', '', false)).toEqual([])
  })

  it('finds case-insensitive by default fold', () => {
    expect(editorfindmatches('AbC abc Abc', 'abc', false)).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
      { start: 8, end: 11 },
    ])
  })

  it('respects case-sensitive', () => {
    expect(editorfindmatches('AbC abc Abc', 'abc', true)).toEqual([
      { start: 4, end: 7 },
    ])
  })

  it('advances by query length (non-overlapping)', () => {
    expect(editorfindmatches('aaaa', 'aa', false)).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ])
  })
})

describe('editorfindnext / editorfindprev', () => {
  const matches = editorfindmatches('one two one', 'one', false)

  it('finds next from cursor with wrap', () => {
    expect(editorfindnext(matches, 0)?.start).toBe(0)
    expect(editorfindnext(matches, 1)?.start).toBe(8)
    expect(editorfindnext(matches, 9)?.start).toBe(0)
  })

  it('finds prev from cursor with wrap', () => {
    // from match start excludes current hit
    expect(editorfindprev(matches, 8)?.start).toBe(0)
    expect(editorfindprev(matches, 0)?.start).toBe(8)
    expect(editorfindprev(matches, 11)?.start).toBe(8)
  })

  it('returns undefined without wrap when exhausted', () => {
    expect(editorfindnext(matches, 9, false)).toBeUndefined()
    expect(editorfindprev(matches, 0, false)).toBeUndefined()
  })
})

describe('editorfindmatchindex', () => {
  const matches = editorfindmatches('xx yy xx', 'xx', false)

  it('matches select span', () => {
    expect(editorfindmatchindex(matches, 2, 0)).toBe(0)
  })

  it('matches cursor at start', () => {
    expect(editorfindmatchindex(matches, 6, undefined)).toBe(1)
  })
})

describe('editorreplaceat / editorreplaceall', () => {
  it('replaces one match', () => {
    const text = 'aa bb aa'
    const match = editorfindmatches(text, 'aa', false)[1]
    expect(editorreplaceat(text, match, 'XX')).toEqual({
      text: 'aa bb XX',
      cursor: 8,
    })
  })

  it('replaces all with count', () => {
    expect(editorreplaceall('Aa bb aa', 'aa', 'Z', false)).toEqual({
      text: 'Z bb Z',
      count: 2,
    })
    expect(editorreplaceall('Aa bb aa', 'aa', 'Z', true)).toEqual({
      text: 'Aa bb Z',
      count: 1,
    })
  })
})
