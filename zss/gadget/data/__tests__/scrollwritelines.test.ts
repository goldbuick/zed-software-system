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
    gadgetstateprovider((player: string) => {
      if (!playerstates[player]) {
        playerstates[player] = initstate()
      }
      return playerstates[player]
    })
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
})
