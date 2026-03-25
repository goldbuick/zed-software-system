jest.mock('zss/config', () => ({
  LANG_DEV: false,
}))

jest.mock('zss/words/reader', () => ({
  READ_CONTEXT: {
    timestamp: 0,
    book: undefined,
    board: undefined,
    element: undefined,
    elementid: '',
    elementisplayer: false,
    elementfocus: '',
    words: [],
    get: undefined,
    haslabel: undefined,
  },
}))

import { parseloghyperlink } from '../parseloghyperlink'

describe('parseloghyperlink', () => {
  it('splits payload and label on the last semicolon', () => {
    const { label, words } = parseloghyperlink(
      'pageopen mypage 12;$blue[scroll] $whitehello',
    )
    expect(label).toBe('$blue[scroll] $whitehello')
    expect(words[0]).toBe('pageopen')
    expect(words[1]).toBe('mypage')
    expect(words[2]).toBe('12')
  })

  it('keeps internal semicolons inside the payload (e.g. copyit)', () => {
    const { label, words } = parseloghyperlink('copyit foo;bar;$greenTap')
    expect(label).toBe('$greenTap')
    expect(words[0]).toBe('copyit')
    expect(words[1]).toBe('foo;bar')
  })

  it('uses legacy tokenize when there is no semicolon', () => {
    const { label, words } = parseloghyperlink('pageopen onlyid')
    expect(label).toBe('PRESS ME')
    expect(words.join(' ')).toContain('pageopen')
    expect(words.join(' ')).toContain('onlyid')
  })
})
