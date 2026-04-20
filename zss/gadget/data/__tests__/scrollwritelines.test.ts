import { zsszedlinklinechip } from 'zss/feature/zsstextui'
import {
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { GADGET_STATE } from 'zss/gadget/data/types'

jest.mock('zss/device/modem', () => ({
  modemobservevaluenumber: jest.fn(),
  modemobservevaluestring: jest.fn(),
  modemwriteinitnumber: jest.fn(),
  modemwriteinitstring: jest.fn(),
  modemwritevaluenumber: jest.fn(),
  modemwritevaluestring: jest.fn(),
}))

jest.mock('zss/mapping/guid', () => ({
  createsid: jest.fn(() => 'sid_test123'),
}))

jest.mock('zss/words/textformat', () => ({
  hascenter: jest.fn(() => undefined),
}))

jest.mock('zss/words/reader', () => ({
  READ_CONTEXT: {
    board: undefined,
    element: undefined,
    elementfocus: undefined,
  },
}))

jest.mock('zss/mapping/value', () => ({
  maptostring: jest.fn((value: unknown) => String(value)),
}))

describe('scrollwritelines', () => {
  const playerstates: Record<string, GADGET_STATE> = {}

  beforeEach(() => {
    playerstates.p1 = initstate()
    gadgetstateprovider(
      (player: string) => {
        if (!playerstates[player]) {
          playerstates[player] = initstate()
        }
        return playerstates[player]
      },
      () => {},
    )
  })

  it('applies plain lines and scrollname', () => {
    scrollwritelines('p1', 'T1', '$RED hi\n  \nworld')
    const s = gadgetstate('p1')
    expect(s.scrollname).toBe('T1')
    expect(s.scroll).toEqual(['$RED hi', '', 'world'])
  })

  it('applies hyperlink with default refscroll chip', () => {
    scrollwritelines('p1', 'T2', '!mypath arg;$greenTap')
    const s = gadgetstate('p1')
    expect(s.scrollname).toBe('T2')
    expect(s.scroll).toHaveLength(1)
    const row = s.scroll![0] as unknown[]
    expect(row[0]).toBe('refscroll')
    expect(row[1]).toBe('$greenTap')
    expect(row[2]).toBe('mypath')
    expect(row[3]).toBe('arg')
  })

  it('uses custom chip for hyperlinks', () => {
    scrollwritelines('p1', 'T3', '!x y;$lbl', 'mychip')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[0]).toBe('mychip')
  })

  it('!@chip prefix overrides default chip for one line', () => {
    scrollwritelines('p1', 'T3b', '!x y;$a\n!@otherchip z w;$b', 'mychip')
    const s = gadgetstate('p1').scroll!
    expect((s[0] as unknown[])[0]).toBe('mychip')
    expect((s[1] as unknown[])[0]).toBe('otherchip')
    expect((s[1] as unknown[])[2]).toBe('z')
  })

  it('zsszedlinklinechip matches manual !@chip tape and escapes semicolons', () => {
    const line = zsszedlinklinechip('otherchip', 'z w', 'lbl')
    expect(line).toBe('!@otherchip z w;lbl')
    scrollwritelines('p1', 'chipb', line, 'mychip')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[0]).toBe('otherchip')
    expect(row[1]).toBe('lbl')
    expect(row[2]).toBe('z')
    expect(row[3]).toBe('w')
    const line2 = zsszedlinklinechip('batch', 'a;b', 'c;d')
    scrollwritelines('p1', 'chipc', line2, 'refscroll')
    const row2 = gadgetstate('p1').scroll![0] as unknown[]
    expect(row2[0]).toBe('batch')
    expect(row2[1]).toBe('c;d')
    expect(row2[2]).toBe('a;b')
  })

  it('treats ! without semicolon as plain text', () => {
    scrollwritelines('p1', 'T4', '!nosemi')
    expect(gadgetstate('p1').scroll).toEqual(['!nosemi'])
  })

  it('hk line splits command into words for gadgethyperlink', () => {
    scrollwritelines('p1', 'T5', '!menu hk 1 " 1 " next;$greenGo')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[0]).toBe('refscroll')
    expect(row[1]).toBe('$greenGo')
    expect(row[2]).toBe('menu')
    expect(row[3]).toBe('hk')
  })

  it('quoted token preserves spaces in bang command args', () => {
    scrollwritelines('p1', 'T5b', '!synthscroll hk s " S " next;synth')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[2]).toBe('synthscroll')
    expect(row[3]).toBe('hk')
    expect(row[4]).toBe('s')
    expect(row[5]).toBe(' S ')
    expect(row[6]).toBe('next')
  })

  it('copyit with multi-word payload joins for extractcontentfromargs', () => {
    scrollwritelines('p1', 'T6', '!copyit one two;$greenLbl')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[2]).toBe('istargetless')
    expect(row[3]).toBe('copyit')
    expect(row[4]).toBe('one')
    expect(row[5]).toBe('two')
  })

  it('decodes $59 to semicolon inside copyit payload token', () => {
    scrollwritelines('p1', 'T7', '!copyit foo$59bar;$greenLbl')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[4]).toBe('foo;bar')
  })

  it('does not treat $590 as semicolon escape', () => {
    scrollwritelines('p1', 'T8', '!x $590;$y')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[3]).toBe('$590')
  })

  it('bookmark url hk line leaves href in trailing args after empty maybenoclose', () => {
    scrollwritelines(
      'p1',
      'bookmarks',
      '!bookmarkurl hk 1 " 1 " "" https://ex.test;$CYANLOAD hi',
      'bookmarkscroll',
    )
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[0]).toBe('bookmarkscroll')
    expect(row[2]).toBe('bookmarkurl')
    expect(row[3]).toBe('hk')
    expect(row[4]).toBe('1')
    expect(row[5]).toBe(' 1 ')
    expect(row[6]).toBe('')
    expect(row[7]).toBe('https://ex.test')
  })

  it('zipfilelist quoted select target is one PanelSelect token (spaces in name)', () => {
    scrollwritelines(
      'p1',
      'zip',
      '!"my doc.txt" select NO 0 YES 1;$cyan[txt]$white',
      'zipfilelist',
    )
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[0]).toBe('zipfilelist')
    expect(row[2]).toBe('my doc.txt')
    expect(row[3]).toBe('select')
  })

  it('bookmark delete uses hyperlink type so id is not parsed as control type', () => {
    scrollwritelines(
      'p1',
      'bookmarks',
      '!bookmarkdel hyperlink abc-id;$REDDELETE 1',
      'bookmarkscroll',
    )
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[2]).toBe('bookmarkdel')
    expect(row[3]).toBe('hyperlink')
    expect(row[4]).toBe('abc-id')
  })
})
