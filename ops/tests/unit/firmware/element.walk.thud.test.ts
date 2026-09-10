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

import type { CHIP } from 'zss/chip'
import { ELEMENT_FIRMWARE } from 'zss/firmware/element'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import { COLLISION } from 'zss/words/types'
import { READ_CONTEXT } from 'zss/words/reader'

describe('element everytick walk thud', () => {
  afterEach(() => {
    memoryresetbooks([])
    READ_CONTEXT.board = undefined
    READ_CONTEXT.book = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
    READ_CONTEXT.elementisplayer = false
    mockedmemorysendtoelement.mockClear()
  })

  function labelsfor(id: string): string[] {
    return mockedmemorysendtoelement.mock.calls
      .filter((call) => (call[1] as { id?: string })?.id === id)
      .map((call) => call[2] as string)
  }

  it('sends thud to walker when step move is blocked by solid', () => {
    memoryresetbooks([
      memorycreatebook([memorycreatecodepage('@bear\n', {})]),
    ])
    const board = memorycreateboard()
    memoryensureboardready(board)
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

    bear!.stepx = 1
    bear!.stepy = 0
    READ_CONTEXT.board = board
    READ_CONTEXT.element = bear
    READ_CONTEXT.elementid = bear!.id ?? ''
    READ_CONTEXT.elementisplayer = false
    READ_CONTEXT.timestamp = 1

    ELEMENT_FIRMWARE.everytick({} as CHIP)

    expect(labelsfor('sid_bear')).toEqual(['thud'])
    expect(bear!.x).toBe(2)
    expect(bear!.y).toBe(2)
  })

  it('sends thud to walker blocked by player', () => {
    memoryresetbooks([
      memorycreatebook([
        memorycreatecodepage('@bear\n', {}),
        memorycreatecodepage('@player\n', {}),
      ]),
    ])
    const board = memorycreateboard()
    memoryensureboardready(board)
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

    bear!.stepx = 1
    bear!.stepy = 0
    READ_CONTEXT.board = board
    READ_CONTEXT.element = bear
    READ_CONTEXT.elementid = bear!.id ?? ''
    READ_CONTEXT.elementisplayer = false
    READ_CONTEXT.timestamp = 1

    ELEMENT_FIRMWARE.everytick({} as CHIP)

    expect(labelsfor('sid_bear')).toEqual(['thud'])
    expect(labelsfor('pid_hero')).toEqual([])
  })
})
