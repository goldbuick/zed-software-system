import {
  applyzedscroll,
  parsemarkdownforscroll,
} from 'zss/feature/parse/markdownscroll'
import {
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { GADGET_STATE } from 'zss/gadget/data/types'
import { WORD } from 'zss/words/types'

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

  it('emits separate scroll rows for CommonMark hard line breaks', () => {
    parsemarkdownforscroll('p1', 'line one  \n$white line two', 'doc')
    const sc = gadgetstate('p1').scroll ?? []
    const textrows = sc.filter((r): r is string => typeof r === 'string')
    expect(textrows).toContain('line one')
    expect(textrows).toContain('$white line two')
  })

  it('passes through !openit URL lines so markdown does not autolink the URL', () => {
    const md =
      '!openit https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/type;filter types'
    parsemarkdownforscroll('p1', md, 'doc')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[0]).toBe('refscroll')
    expect(row[1]).toBe('filter types')
    expect(row[2]).toBe('istargetless')
    expect(row[3]).toBe('openit')
    expect(row[4]).toBe(
      'https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/type',
    )
  })

  it('does not passthrough !cmd;label lines inside fenced code blocks', () => {
    parsemarkdownforscroll('p1', '```\n!openit https://x;y\n```', 'doc')
    const sc = gadgetstate('p1').scroll ?? []
    const hyperlinkrows = sc.filter((r) => Array.isArray(r)) as unknown[][]
    expect(hyperlinkrows).toHaveLength(0)
    expect(sc.some((r) => typeof r === 'string' && r.includes('!openit'))).toBe(
      true,
    )
  })

  it('keeps later standalone !tape rows after a standalone !openit line (single parse)', () => {
    const md = `## Hyperlinks

- before item

!openit https://example.com/doc;open example

!flagorstat range; Label
`
    parsemarkdownforscroll('p1', md, 'doc')
    const sc = gadgetstate('p1').scroll ?? []
    const rows = sc.filter((r): r is WORD[] => Array.isArray(r))
    const openit = rows.find((r) => r[3] === 'openit')
    expect(openit).toBeDefined()
    expect(openit![4]).toBe('https://example.com/doc')
    const flag = rows.find((r) => r[2] === 'flagorstat')
    expect(flag).toBeDefined()
    expect(flag![1]).toBe('Label')
    expect(flag![3]).toBe('range')
  })
})

describe('applyzedscroll', () => {
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

  it('refscroll menu: !command;label lines become hyperlink rows', () => {
    const body = `!helpmenu hk 1 " 1 " next;controls and $greenstart here
!objectlistscroll hk 2 " 2 " next;list objects`
    applyzedscroll('p1', body, 'menu')
    const s = gadgetstate('p1')
    expect(s.scroll).toHaveLength(2)
    const r0 = s.scroll![0] as unknown[]
    expect(r0[0]).toBe('refscroll')
    expect(r0[2]).toBe('helpmenu')
    expect(r0[3]).toBe('hk')
    const r1 = s.scroll![1] as unknown[]
    expect(r1[2]).toBe('objectlistscroll')
  })

  it('refscroll menu: quoted arg keeps spaces', () => {
    applyzedscroll('p1', '!synthscroll hk s " S " next;synth', 'menu')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[2]).toBe('synthscroll')
    expect(row[5]).toBe(' S ')
  })
})
