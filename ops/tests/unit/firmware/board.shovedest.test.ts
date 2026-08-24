import { memoryevaldir } from 'zss/memory/boarddirection'
import { BOARD, BOARD_ELEMENT } from 'zss/memory/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

/**
 * Mirrors shove/push dest handling: parse DIR under the caller (flag/stat
 * exprs), then memoryevaldir from the target cell (relative motion).
 */
function readevaldirfromtarget(
  words: (string | number)[],
  target: BOARD_ELEMENT,
  board: BOARD,
) {
  const [ascaller] = readargs(words, 0, [ARG_TYPE.DIR])
  return memoryevaldir(board, target, '', ascaller.dir, {
    x: target.x ?? 0,
    y: target.y ?? 0,
  })
}

describe('shove dest dir: caller stats, target origin', () => {
  const board = { id: 'testboard', objects: {} } as BOARD

  afterEach(() => {
    READ_CONTEXT.element = undefined
    READ_CONTEXT.get = undefined
    READ_CONTEXT.words = []
    READ_CONTEXT.board = undefined
  })

  it('resolves at x p2 from caller get, not target p2', () => {
    const caller = { id: 'caller', x: 0, y: 0, p2: 1 } as BOARD_ELEMENT
    const target = { id: 'target', x: 4, y: 4, p2: 0 } as BOARD_ELEMENT
    READ_CONTEXT.board = board
    READ_CONTEXT.element = caller
    // Simulate chip.get after firmware would read caller stats (pre-swap).
    READ_CONTEXT.get = (name: string) =>
      name === 'p2' ? (caller.p2 as number) : undefined

    const dest = readevaldirfromtarget(['at', 2, 'p2'], target, board)
    expect(dest.destpt).toEqual({ x: 2, y: 1 })
  })

  it('applies relative north from the target cell', () => {
    const caller = { id: 'caller', x: 0, y: 0 } as BOARD_ELEMENT
    const target = { id: 'target', x: 4, y: 4 } as BOARD_ELEMENT
    READ_CONTEXT.board = board
    READ_CONTEXT.element = caller

    const dest = readevaldirfromtarget(['north'], target, board)
    expect(dest.destpt).toEqual({ x: 4, y: 3 })
  })
})
