import {
  notetokenpitchclass,
  parsenotespacepitchclasses,
  spellpitchclass,
  transposenotesstring,
} from 'zss/memory/notecopyscroll'

/** Unique pitch classes (modes of C major share these seven PCs). */
function pitchclassset7(input: string): string {
  const p = parsenotespacepitchclasses(input)
  expect(p).toBeDefined()
  return [...new Set(p!)]
    .sort((a, b) => a - b)
    .join(',')
}

describe('notecopyscroll', () => {
  it('spellpitchclass uses sharps when prefersharp', () => {
    expect(spellpitchclass(1, true)).toBe('c#')
    expect(spellpitchclass(6, true)).toBe('f#')
  })

  it('spellpitchclass uses flats when not prefersharp', () => {
    expect(spellpitchclass(1, false)).toBe('d!')
    expect(spellpitchclass(6, false)).toBe('g!')
  })

  it('parses note tokens to pitch classes', () => {
    expect(notetokenpitchclass('c')).toBe(0)
    expect(notetokenpitchclass('c#')).toBe(1)
    expect(notetokenpitchclass('d!')).toBe(1)
    expect(notetokenpitchclass('f#')).toBe(6)
  })

  it('parsenotespacepitchclasses returns undefined for invalid token', () => {
    expect(parsenotespacepitchclasses('c x z')).toBeUndefined()
    expect(parsenotespacepitchclasses('')).toBeUndefined()
  })

  it('transposenotesstring +1 prefers sharps', () => {
    expect(transposenotesstring('c d e', 1)).toBe('c# d# f')
  })

  it('transposenotesstring -1 prefers flats', () => {
    expect(transposenotesstring('c d e', -1)).toBe('b d! e!')
  })

  it('transposenotesstring +2 prefers sharps', () => {
    expect(transposenotesstring('c e g', 2)).toBe('d f# a')
  })

  it('jazz C-parent modes share the same seven pitch classes as C Ionian', () => {
    const ionian = pitchclassset7('c d e f g a b c')
    const modes = [
      'c d e f g a b c',
      'd e f g a b c d',
      'e f g a b c d e',
      'f g a b c d e f',
      'g a b c d e f g',
      'a b c d e f g a',
      'b c d e f g a b',
    ]
    for (let i = 0; i < modes.length; ++i) {
      expect(pitchclassset7(modes[i])).toBe(ionian)
    }
  })
})
