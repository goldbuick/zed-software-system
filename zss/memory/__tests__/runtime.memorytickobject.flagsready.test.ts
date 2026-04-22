import { memorytickobject } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritesoftwarebook } from 'zss/memory/session'
import { BOARD, BOARD_ELEMENT, BOOK, MEMORY_LABEL } from 'zss/memory/types'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 0,
    DRAW_CHAR_HEIGHT: () => 0,
  },
}))

jest.mock('tone', () => ({
  Time: class TimeMock {},
}))

jest.mock('zss/lang/generator', () => ({
  compile: () => ({ labels: {} }),
}))

describe('memorytickobject player flags readiness', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('returns without running chip when player has no flags.board', () => {
    const board: BOARD = {
      id: 'b1',
      name: 'b',
      terrain: [],
      objects: {
        pid_1: {
          id: 'pid_1',
          kind: 'player',
          x: 0,
          y: 0,
          code: '#zss\n:touch\n  return',
        } as BOARD_ELEMENT,
      },
    } as BOARD

    const book: BOOK = {
      id: 'main-id',
      name: 'main',
      timestamp: 0,
      activelist: ['pid_1'],
      pages: [],
      flags: { pid_1: { user: 'x' } as BOOK['flags'][string] },
    }

    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')

    const el = board.objects.pid_1
    const code = `${el.kind ?? ''}\n${el.code ?? ''}`

    expect(() => memorytickobject(book, board, el, code)).not.toThrow()
  })
})
