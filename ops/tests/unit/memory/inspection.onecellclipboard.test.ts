/**
 * One-cell inspect offers the same batch clipboard links as an area selection.
 */
import { durableget, durableupdate } from 'zss/feature/durable'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { memorywriteterrainfromkind } from 'zss/memory/boardlifecycle'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memoryinspect } from 'zss/memory/inspection'
import { memoryinspectcopy } from 'zss/memory/inspectionbatch'
import { memorywritebookplayerboard } from 'zss/memory/playermanagement'
import { memoryresetbooks } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

const store = new Map<string, unknown>()

jest.mock('zss/feature/durable', () => ({
  durableget: jest.fn(async () => undefined),
  durableupdate: jest.fn(async () => undefined),
}))

jest.mock('zss/gadget/data/scrollwritelines', () => ({
  scrollwritelines: jest.fn(),
}))

const PLAYER = 'pid_one_cell'
const PT = { x: 4, y: 9 }
const EMPTY = { x: 1, y: 1 }

function lasttape(): string {
  const calls = jest.mocked(scrollwritelines).mock.calls
  return calls[calls.length - 1][2] as string
}

describe('one-cell inspect clipboard', () => {
  beforeEach(() => {
    store.clear()
    jest.mocked(durableget).mockImplementation(async (key: string) => {
      return store.get(key)
    })
    jest.mocked(durableupdate).mockImplementation(async (key, updater) => {
      store.set(key, updater(store.get(key)))
    })
  })

  afterEach(() => {
    memoryresetbooks([])
    store.clear()
    jest.mocked(scrollwritelines).mockReset()
  })

  it('offers copy and cut, and paste after a buffer exists', async () => {
    const wallpage = memorycreatecodepage('@terrain wall\n@char 178\n', {})
    const boardpage = memorycreatecodepage('@board title\n', {})
    const book = memorycreatebook([wallpage, boardpage])
    memoryresetbooks([book], book.id)
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    memorywritebookplayerboard(book, PLAYER, board.id)
    memorywriteterrainfromkind(board, PT, 'wall')

    await memoryinspect(PLAYER, PT, PT)
    const before = lasttape()
    expect(before).toContain('copy elements')
    expect(before).toContain('cut elements')
    expect(before).not.toContain('paste elements')
    expect(before).toContain(`copy:${PT.x},${PT.y},${PT.x},${PT.y}`)

    await memoryinspect(PLAYER, EMPTY, EMPTY)
    const emptybefore = lasttape()
    expect(emptybefore).toContain('copy elements')
    expect(emptybefore).toContain('cut elements')
    expect(emptybefore).not.toContain('paste elements')
    expect(emptybefore).toContain(
      `copy:${EMPTY.x},${EMPTY.y},${EMPTY.x},${EMPTY.y}`,
    )

    await memoryinspectcopy(PLAYER, PT, PT, 'copyall')

    await memoryinspect(PLAYER, PT, PT)
    const after = lasttape()
    expect(after).toContain('copy elements')
    expect(after).toContain('cut elements')
    expect(after).toContain('paste elements')
    expect(after).toContain(`paste:${PT.x},${PT.y},${PT.x},${PT.y}`)

    await memoryinspect(PLAYER, EMPTY, EMPTY)
    const emptyafter = lasttape()
    expect(emptyafter).toContain('paste elements')
    expect(emptyafter).toContain(
      `paste:${EMPTY.x},${EMPTY.y},${EMPTY.x},${EMPTY.y}`,
    )
  })
})
