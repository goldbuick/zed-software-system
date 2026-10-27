import { memoryqueuedrawdisplay } from 'zss/memory/boarddrawqueue'
import { memorydraindrawpending } from 'zss/memory/runtime'
import { BOARD, BOARD_ELEMENT, BOARD_SIZE, BOOK } from 'zss/memory/types'

jest.mock('zss/feature/lang/langcompileclient', () => ({
  compilescript: (_name: string, code: string) => ({
    labels: code.includes(':drawdisplay') ? { drawdisplay: [1] } : {},
  }),
}))

jest.mock('zss/os', () => {
  const once = jest.fn()
  return {
    createos: () => ({
      once,
      tick: jest.fn(),
      halt: jest.fn(),
    }),
    __testonce: once,
  }
})

const { __testonce: once } = jest.requireMock('zss/os') as {
  __testonce: jest.Mock
}

function makeboard(objects: Record<string, BOARD_ELEMENT> = {}) {
  return {
    id: 'board_test',
    name: 'board test',
    objects,
    terrain: new Array<BOARD_ELEMENT>(BOARD_SIZE),
  } as BOARD
}

function makeobject(id: string, kindcode: string): BOARD_ELEMENT {
  const object: BOARD_ELEMENT = {
    id,
    x: 1,
    y: 1,
    kind: 'object_kind',
  }
  Object.assign(object, {
    kinddata: { id: 'object_kind', code: kindcode },
  })
  return object
}

describe('drawdisplay create queue', () => {
  beforeEach(() => {
    once.mockClear()
  })

  it('queues object id when kind code has :drawdisplay', () => {
    const board = makeboard()
    const object = makeobject('sid_star', '@star\n:drawdisplay\n#end')
    memoryqueuedrawdisplay(board, object)
    expect(board.drawpendingids?.has('sid_star')).toBe(true)
  })

  it('does not queue when code has no :drawdisplay', () => {
    const board = makeboard()
    const object = makeobject('sid_plain', '@plain\n:think\n#end')
    memoryqueuedrawdisplay(board, object)
    expect(board.drawpendingids).toBeUndefined()
  })

  it('drain runs once and clears pending', () => {
    const object = makeobject('sid_star', '@star\n:drawdisplay\n#end')
    const board = makeboard({ [object.id ?? '']: object })
    board.drawpendingids = new Set(['sid_star'])
    const book = { timestamp: 1 } as BOOK

    memorydraindrawpending(book, board)

    expect(board.drawpendingids).toBeUndefined()
    expect(once).toHaveBeenCalledTimes(1)
    expect(once.mock.calls[0][0]).toBe('sid_star_draw')
    expect(once.mock.calls[0][4]).toBe('drawdisplay')
  })
})
