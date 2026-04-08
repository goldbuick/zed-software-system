import {
  memoryelementtologprefix,
  memoryelementtotickerprefix,
} from '../rendering'
import { BOARD_ELEMENT } from '../types'
import { COLOR } from 'zss/words/types'

const mockedmemoryreadflags = jest.fn()

jest.mock('../flags', () => ({
  memoryreadflags: (...args: unknown[]) => mockedmemoryreadflags(...args),
}))

function baseelement(over: Partial<BOARD_ELEMENT> = {}): BOARD_ELEMENT {
  return {
    id: 'oid',
    kind: 'chest',
    name: 'logical',
    char: 2,
    color: COLOR.WHITE,
    bg: COLOR.BLACK,
    kinddata: {
      id: 'chest',
      name: 'chest',
    },
    ...over,
  }
}

describe('memoryelementtotickerprefix', () => {
  beforeEach(() => {
    mockedmemoryreadflags.mockReturnValue({})
  })

  it('returns empty string when element has no id', () => {
    const el = baseelement({ id: undefined })
    expect(memoryelementtotickerprefix(el)).toBe('')
  })

  it('uses element displayname when non-empty', () => {
    const el = baseelement({ displayname: 'Shown' })
    expect(memoryelementtotickerprefix(el)).toContain('$CYAN shown:$WHITE ')
  })

  it('falls back to kind displayname when element displayname unset', () => {
    const el = baseelement({
      kinddata: { id: 'chest', name: 'chest', displayname: 'FromKind' },
    })
    expect(memoryelementtotickerprefix(el)).toContain(
      '$CYAN fromkind:$WHITE ',
    )
  })

  it('falls back to logical name when displayname unset', () => {
    const el = baseelement()
    expect(memoryelementtotickerprefix(el)).toContain('$CYAN logical:$WHITE ')
  })

  it('uses user flag for player like log prefix', () => {
    mockedmemoryreadflags.mockReturnValue({ user: 'Pat' })
    const el = baseelement({
      kind: 'player',
      displayname: 'ignored for player',
    })
    expect(memoryelementtotickerprefix(el)).toContain('$CYAN Pat:$WHITE ')
    expect(memoryelementtologprefix(el)).toEqual(memoryelementtotickerprefix(el))
  })

  it('differs from log prefix when object has displayname', () => {
    const el = baseelement({ displayname: 'TickerOnly' })
    expect(memoryelementtotickerprefix(el)).toContain('$CYAN tickeronly:$WHITE ')
    expect(memoryelementtologprefix(el)).toContain('$CYAN logical:$WHITE ')
  })
})
