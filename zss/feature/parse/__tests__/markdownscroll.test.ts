import { scrollwritemarkdownlines } from 'zss/feature/parse/markdownscroll'
import {
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { GADGET_STATE } from 'zss/gadget/data/types'
import { noop } from 'zss/mapping/types'
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
    gadgetstateprovider(
      (player: string) => {
        if (!playerstates[player]) {
          playerstates[player] = initstate()
        }
        return playerstates[player]
      },
      noop,
    )
  })

  it('emits bang rows so multi-word href becomes multiple hyperlink words', () => {
    scrollwritemarkdownlines('p1', '[go](<topic sub>)', 'doc')
    const s = gadgetstate('p1')
    expect(s.scrollname).toBe('doc')
    expect(s.scroll).toHaveLength(1)
    const row = s.scroll![0] as unknown[]
    expect(row[0]).toBe('refscroll')
    expect(row[2]).toBe('topic')
    expect(row[3]).toBe('sub')
  })

  it('uses !copyit line shape for copyit links', () => {
    scrollwritemarkdownlines('p1', '[copy me](<copyit page-id>)', 'doc')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[2]).toBe('istargetless')
    expect(row[3]).toBe('copyit')
    expect(row[4]).toBe('page-id')
  })

  it('encodes semicolon in label as $59 in the line', () => {
    scrollwritemarkdownlines('p1', '[a;b](foo)', 'doc')
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[1]).toContain(';')
  })

  it('emits separate scroll rows for CommonMark hard line breaks', () => {
    scrollwritemarkdownlines('p1', 'line one  \n$white line two', 'doc')
    const sc = gadgetstate('p1').scroll ?? []
    const textrows = sc.filter((r): r is string => typeof r === 'string')
    expect(textrows).toContain('line one')
    expect(textrows).toContain('$white line two')
  })

  it('passes through !openit URL lines so markdown does not autolink the URL', () => {
    const md =
      '!openit https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/type;filter types'
    scrollwritemarkdownlines('p1', md, 'doc')
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
    scrollwritemarkdownlines('p1', '```\n!openit https://x;y\n```', 'doc')
    const sc = gadgetstate('p1').scroll ?? []
    const hyperlinkrows = sc.filter((r) => Array.isArray(r)) as unknown[][]
    expect(hyperlinkrows).toHaveLength(0)
    expect(sc.some((r) => typeof r === 'string' && r.includes('!openit'))).toBe(
      true,
    )
  })

  it('does not emit a blank row before a heading at the start of the document', () => {
    scrollwritemarkdownlines('p1', '# Hello', 'doc')
    const sc = gadgetstate('p1').scroll ?? []
    expect(sc.length).toBeGreaterThan(0)
    expect(sc[0]).not.toBe('')
    scrollwritemarkdownlines('p1', '### Shallow', 'doc2')
    const sc2 = gadgetstate('p1').scroll ?? []
    expect(sc2.length).toBeGreaterThan(0)
    expect(sc2[0]).not.toBe('')
  })

  it('keeps later standalone !tape rows after a standalone !openit line (single parse)', () => {
    const md = `## Hyperlinks

- before item

!openit https://example.com/doc;open example

!flagorstat range; Label
`
    scrollwritemarkdownlines('p1', md, 'doc')
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

describe('scrollwritelines zed body', () => {
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
      noop,
    )
  })

  it('refscroll menu: !command;label lines become hyperlink rows', () => {
    const body = `!helpmenu hk 1 " 1 " next;controls and $greenstart here
!objectlistscroll hk 2 " 2 " next;list objects`
    scrollwritelines('p1', 'menu', body, 'refscroll')
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
    scrollwritelines(
      'p1',
      'menu',
      '!synthscroll hk s " S " next;synth',
      'refscroll',
    )
    const row = gadgetstate('p1').scroll![0] as unknown[]
    expect(row[2]).toBe('synthscroll')
    expect(row[5]).toBe(' S ')
  })
})
