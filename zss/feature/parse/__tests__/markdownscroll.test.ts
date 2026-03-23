import {
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { GADGET_STATE } from 'zss/gadget/data/types'
import { parsemarkdownforscroll } from 'zss/feature/parse/markdownscroll'

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

describe('parsemarkdownforscroll', () => {
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

  it('emits bang rows so multi-word href becomes multiple hyperlink words', () => {
    parsemarkdownforscroll('p1', '[go](<topic sub>)', 'doc')
    const s = gadgetstate('p1')
    expect(s.scrollname).toBe('doc')
    expect(s.scroll).toHaveLength(1)
    const row = s.scroll![0] as unknown[]
    expect(row[0]).toBe('refscroll')
    expect(row[2]).toBe('topic')
    expect(row[3]).toBe('sub')
  })

  it('uses !copyit line shape for copyit links', () => {
    parsemarkdownforscroll('p1', '[copy me](<copyit page-id>)', 'doc')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[2]).toBe('istargetless')
    expect(row[3]).toBe('copyit')
    expect(row[4]).toBe('page-id')
  })

  it('encodes semicolon in label as $59 in the line', () => {
    parsemarkdownforscroll('p1', '[a;b](foo)', 'doc')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[1]).toContain(';')
  })
})
