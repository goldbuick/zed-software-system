import {
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { gadgetapplyscrolllines } from 'zss/gadget/data/applyscrolllines'
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

describe('applyscrolllines', () => {
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
    gadgetapplyscrolllines('p1', 'T1', '$RED hi\n  \nworld')
    const s = gadgetstate('p1')
    expect(s.scrollname).toBe('T1')
    expect(s.scroll).toEqual(['$RED hi', 'world'])
  })

  it('applies hyperlink with default refscroll chip', () => {
    gadgetapplyscrolllines('p1', 'T2', '!mypath arg;$greenTap')
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
    gadgetapplyscrolllines('p1', 'T3', '!x y;$lbl', 'mychip')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[0]).toBe('mychip')
  })

  it('treats ! without semicolon as plain text', () => {
    gadgetapplyscrolllines('p1', 'T4', '!nosemi')
    expect(gadgetstate('p1').scroll).toEqual(['!nosemi'])
  })

  it('hk line uses six-word layout', () => {
    gadgetapplyscrolllines('p1', 'T5', '!menu hk 1 1 next;$greenGo')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[0]).toBe('refscroll')
    expect(row[1]).toBe('$greenGo')
    expect(row[2]).toBe('menu')
    expect(row[3]).toBe('hk')
  })
})
