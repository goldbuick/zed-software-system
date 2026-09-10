const mockedmemorychipispresent = jest.fn()
const mockedmemorymessagechip = jest.fn()
jest.mock('zss/memory/runtime', () => {
  const actual = jest.requireActual('zss/memory/runtime') as Record<
    string,
    unknown
  >
  return {
    ...actual,
    memorychipispresent: (...args: unknown[]) =>
      mockedmemorychipispresent(...args),
    memorymessagechip: (...args: unknown[]) => mockedmemorymessagechip(...args),
  }
})

import type { CHIP } from 'zss/chip'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
  memorywriteterrain,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memorysendtoelement, memorysendtoelements } from 'zss/memory/gamesend'
import { READ_LAYER, memoryreadelement } from 'zss/memory/boardaccess'
import { memoryresetbooks } from 'zss/memory/session'
import { BOARD_WIDTH } from 'zss/memory/types'
import { DIR } from 'zss/words/types'
import { READ_CONTEXT } from 'zss/words/reader'

function stubchip(): CHIP {
  return {
    id: () => 'sid_from',
  } as CHIP
}

describe('shot damage send to terrain', () => {
  afterEach(() => {
    memoryresetbooks([])
    READ_CONTEXT.board = undefined
    READ_CONTEXT.timestamp = 0
  })

  function setupboard() {
    mockedmemorychipispresent.mockReturnValue(true)
    mockedmemorymessagechip.mockClear()
    memoryresetbooks([
      memorycreatebook([
        memorycreatecodepage('@object gem\n@isbreakable\n', {}),
        memorycreatecodepage('@terrain breakable\n@isbreakable\n', {}),
      ]),
    ])
    const board = memorycreateboard()
    memoryensureboardready(board)
    READ_CONTEXT.board = board
    READ_CONTEXT.timestamp = 42
    const from = memorycreateboardobjectfromkind(
      board,
      { x: 1, y: 1 },
      'gem',
      'sid_from',
    )!
    from.breakable = 0
    return { board, from }
  }

  it('clears breakable terrain on shot', () => {
    const { board, from } = setupboard()
    const pt = { x: 3, y: 3 }
    const idx = pt.x + pt.y * BOARD_WIDTH
    memorywriteterrain(board, {
      x: pt.x,
      y: pt.y,
      kind: 'breakable',
      breakable: 1,
    })
    expect(
      memoryreadelement(board, { x: pt.x, y: pt.y }, READ_LAYER.TERRAIN)?.kind,
    ).toBe('breakable')

    const terrain = memoryreadelement(
      board,
      { x: pt.x, y: pt.y },
      READ_LAYER.TERRAIN,
    )!
    terrain.x = pt.x
    terrain.y = pt.y
    memorysendtoelement(from, terrain, 'shot')

    const after = board.terrain[idx]
    expect(after?.kind).toBeUndefined()
    expect(after?.breakable).toBeUndefined()
  })

  it('does not clear breakable terrain on bombed', () => {
    const { board, from } = setupboard()
    const pt = { x: 4, y: 4 }
    const idx = pt.x + pt.y * BOARD_WIDTH
    memorywriteterrain(board, {
      x: pt.x,
      y: pt.y,
      kind: 'breakable',
      breakable: 1,
    })
    const terrain = memoryreadelement(
      board,
      { x: pt.x, y: pt.y },
      READ_LAYER.TERRAIN,
    )!
    terrain.x = pt.x
    terrain.y = pt.y
    memorysendtoelement(from, terrain, 'bombed')

    expect(board.terrain[idx]?.kind).toBe('breakable')
    expect(board.terrain[idx]?.breakable).toBe(1)
  })

  it('sends shot to object and clears breakable terrain under it', () => {
    const { board, from } = setupboard()
    const pt = { x: 5, y: 5 }
    const idx = pt.x + pt.y * BOARD_WIDTH
    memorywriteterrain(board, {
      x: pt.x,
      y: pt.y,
      kind: 'breakable',
      breakable: 1,
    })
    const target = memorycreateboardobjectfromkind(
      board,
      pt,
      'gem',
      'sid_target',
    )!
    target.breakable = 0

    memorysendtoelements(stubchip(), from, {
      label: 'shot',
      args: [],
      targetdir: {
        dir: DIR.AT,
        startpt: pt,
        destpt: pt,
        layer: DIR.IDLE,
        targets: [pt],
      },
    })

    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'sid_target:shot',
      }),
    )
    expect(board.terrain[idx]?.kind).toBeUndefined()
    expect(board.terrain[idx]?.breakable).toBeUndefined()
    expect(target.removed).toBeUndefined()
  })
})
