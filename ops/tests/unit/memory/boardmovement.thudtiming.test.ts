const mockedmemorysendtoelement = jest.fn()
jest.mock('zss/memory/gamesend', () => {
  const actual = jest.requireActual('zss/memory/gamesend') as Record<
    string,
    unknown
  >
  return {
    ...actual,
    memorysendtoelement: (...args: unknown[]) =>
      mockedmemorysendtoelement(...args),
  }
})

import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorymoveobject } from 'zss/memory/boardmovement'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import { COLLISION } from 'zss/words/types'
import { READ_CONTEXT } from 'zss/words/reader'

describe('memorymoveobject does not emit thud', () => {
  afterEach(() => {
    memoryresetbooks([])
    READ_CONTEXT.board = undefined
    mockedmemorysendtoelement.mockClear()
  })

  function setupboard(...codes: string[]) {
    memoryresetbooks([
      memorycreatebook(codes.map((code) => memorycreatecodepage(code, {}))),
    ])
    const board = memorycreateboard()
    memoryensureboardready(board)
    READ_CONTEXT.board = board
    READ_CONTEXT.timestamp = 1
    return board
  }

  function labelsfor(id: string): string[] {
    return mockedmemorysendtoelement.mock.calls
      .filter((call) => (call[1] as { id?: string })?.id === id)
      .map((call) => call[2] as string)
  }

  it('does not send thud when creature blocked by player', () => {
    const board = setupboard('@bear\n', '@player\n')
    const player = memorycreateboardobjectfromkind(
      board,
      { x: 3, y: 2 },
      'player',
      'pid_hero',
    )
    const bear = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 2 },
      'bear',
      'sid_bear',
    )
    expect(player).toBeDefined()
    expect(bear).toBeDefined()
    memoryensureboardready(board)

    const moved = memorymoveobject(undefined, board, bear!, { x: 3, y: 2 })
    expect(moved).toBe(false)
    expect(labelsfor('sid_bear')).toEqual([])
    expect(labelsfor('pid_hero')).toEqual([])
  })

  it('does not send thud when creature blocked by solid', () => {
    const board = setupboard('@bear\n')
    const bear = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 2 },
      'bear',
      'sid_bear',
    )
    expect(bear).toBeDefined()
    board.terrain[3 + 2 * 60] = {
      kind: 'solid',
      collision: COLLISION.ISSOLID,
      x: 3,
      y: 2,
    }
    memoryensureboardready(board)

    const moved = memorymoveobject(undefined, board, bear!, { x: 3, y: 2 })
    expect(moved).toBe(false)
    expect(labelsfor('sid_bear')).toEqual([])
    expect(
      mockedmemorysendtoelement.mock.calls.some((call) => call[2] === 'bump'),
    ).toBe(false)
  })

  it('sends touch to object when player walks into it', () => {
    const board = setupboard('@bear\n', '@player\n')
    const bear = memorycreateboardobjectfromkind(
      board,
      { x: 3, y: 2 },
      'bear',
      'sid_bear',
    )
    const player = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 2 },
      'player',
      'pid_hero',
    )
    expect(bear).toBeDefined()
    expect(player).toBeDefined()
    memoryensureboardready(board)

    const moved = memorymoveobject(undefined, board, player!, { x: 3, y: 2 })
    expect(moved).toBe(false)
    expect(labelsfor('sid_bear')).toContain('touch')
    expect(labelsfor('sid_bear')).not.toContain('thud')
  })
})
