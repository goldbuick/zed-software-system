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

import { parsezedlinkline } from 'zss/feature/zedlinkparse'

describe('parsezedlinkline', () => {
  it('splits payload and label on the first semicolon', () => {
    const parsed = parsezedlinkline(
      '!pageopen mypage 12;$blue[scroll] $whitehello',
    )
    expect(parsed?.label).toBe('$blue[scroll] $whitehello')
    expect(parsed?.words[0]).toBe('pageopen')
    expect(parsed?.words[1]).toBe('mypage')
    expect(parsed?.words[2]).toBe('12')
  })

  it('keeps $59-decoded semicolons inside the payload (e.g. copyit)', () => {
    const parsed = parsezedlinkline('!copyit foo$59bar;$greenTap')
    expect(parsed?.label).toBe('$greenTap')
    expect(parsed?.words[0]).toBe('copyit')
    expect(parsed?.words[1]).toBe('foo;bar')
  })

  it('handles terminal double-bang empty modem prefix', () => {
    const parsed = parsezedlinkline('!!copyit foo$59bar;$greenTap')
    expect(parsed?.modemprefix).toBe('')
    expect(parsed?.words[0]).toBe('copyit')
    expect(parsed?.words[1]).toBe('foo;bar')
  })

  it('parses tape modem prefix chip:target', () => {
    const parsed = parsezedlinkline(
      '!!zipfilelist:my.txt!select NO 0 YES 1;$cyan[txt]',
    )
    expect(parsed?.modemprefix).toBe('zipfilelist:my.txt')
    expect(parsed?.chip).toBe('zipfilelist')
    expect(parsed?.words[0]).toBe('select')
  })

  it('parses !@chip override', () => {
    const parsed = parsezedlinkline('!@otherchip z w;lbl', 'mychip')
    expect(parsed?.chip).toBe('otherchip')
    expect(parsed?.words).toEqual(['z', 'w'])
    expect(parsed?.label).toBe('lbl')
  })

  it('uses quoted tokens', () => {
    const parsed = parsezedlinkline('!menu hk 1 " 1 " next;$greenGo')
    expect(parsed?.words[0]).toBe('menu')
    expect(parsed?.words[3]).toBe(' 1 ')
  })

  it('uses legacy tokenize when there is no semicolon', () => {
    const parsed = parsezedlinkline('!pageopen onlyid')
    expect(parsed?.label).toBe('PRESS ME')
    expect(parsed?.words.join(' ')).toContain('pageopen')
    expect(parsed?.words.join(' ')).toContain('onlyid')
  })
})
