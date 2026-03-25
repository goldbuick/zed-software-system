jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 8,
    DRAW_CHAR_HEIGHT: () => 16,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  STATS_DEV: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
}))

jest.mock('zss/gadget/data/api', () => ({
  gadgetstate: jest.fn(() => ({ scrollname: '', scroll: [] })),
  gadgethyperlink: jest.fn(),
  gadgetcheckqueue: jest.fn(() => []),
  gadgettext: jest.fn(),
}))

jest.mock('zss/device/api', () => ({
  apitoast: jest.fn(),
  registercopy: jest.fn(),
}))

jest.mock('zss/device/session', () => ({
  SOFTWARE: {},
}))

import {
  notetokenpitchclass,
  parsenotespacepitchclasses,
  spellpitchclass,
  transposenotesstring,
} from 'zss/memory/notestransposescroll'

/** Unique pitch classes (modes of C major share these seven PCs). */
function pitchclassset7(input: string): string {
  const p = parsenotespacepitchclasses(input)
  expect(p).toBeDefined()
  return [...new Set(p!)]
    .sort((a, b) => a - b)
    .join(',')
}

describe('notestransposescroll pitch helpers', () => {
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

  it('transposenotesstring passes through + and - octave directives', () => {
    expect(transposenotesstring('c d + e', 1)).toBe('c# d# + f')
    expect(transposenotesstring('c d e f g a b + c', 0)).toBe(
      'c d e f g a b + c',
    )
    expect(transposenotesstring('c d e f g a b +c', 0)).toBe(
      'c d e f g a b +c',
    )
  })

  it('parsenotespacepitchclasses skips octave directives', () => {
    expect(parsenotespacepitchclasses('c d + e')).toEqual([0, 2, 4])
    expect(parsenotespacepitchclasses('c d +e')).toEqual([0, 2, 4])
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

  it('transposenotesstring passes through non-note words', () => {
    expect(transposenotesstring('cx dx c e', 1)).toBe('cx dx c# f')
  })

  it('transposenotesstring preserves semicolons and spacing', () => {
    expect(transposenotesstring('c e g; d f a', 1)).toBe('c# f g#; d# f# a#')
  })

  it('transposenotesstring +c compact word transposes note after +', () => {
    expect(transposenotesstring('+c d', 1)).toBe('+c# d#')
  })

  it('transposenotesstring returns string for mixed valid and invalid tokens', () => {
    expect(transposenotesstring('c x z', 1)).toBe('c# x z')
  })
})
