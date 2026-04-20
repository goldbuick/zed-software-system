import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { handleloader } from 'zss/device/vm/handlers/loader'
import { parsezztobj } from 'zss/feature/parse/zztobj'
import { memoryreadcodepage } from 'zss/memory/bookoperations'
import {
  memoryreadbookbysoftware,
  memoryresetbooks,
  memorywriteoperator,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

function makemainbook(): BOOK {
  return {
    id: 'main-id',
    name: 'main',
    timestamp: 0,
    activelist: [],
    pages: [],
    flags: {},
  }
}

const vm = { emit: jest.fn() } as unknown as DEVICE

describe('file imports target MEMORY_LABEL.GAME', () => {
  beforeEach(() => {
    memoryresetbooks([makemainbook()])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    memorywriteoperator('op')
  })

  afterEach(() => {
    memoryresetbooks([])
    memorywriteoperator('')
  })

  it('memoryresetbooks binds software.game when a book is named game', () => {
    const gamebook: BOOK = {
      id: 'game-id',
      name: 'game',
      timestamp: 0,
      activelist: [],
      pages: [],
      flags: {},
    }
    memoryresetbooks([makemainbook(), gamebook])
    expect(memoryreadbookbysoftware(MEMORY_LABEL.GAME)?.id).toBe('game-id')
  })

  it('parsezztobj writes new codepage into the game book, not main', () => {
    parsezztobj('op', 't.obj', ':noop\n#end\n')
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    const gamebook = memoryreadbookbysoftware(MEMORY_LABEL.GAME)
    expect(gamebook).toBeDefined()
    expect(gamebook!.pages.length).toBe(1)
    expect(mainbook?.pages.length).toBe(0)
  })

  it('handleloader applies .codepage.json into the game book', () => {
    const cp = {
      id: 'cp-import-1',
      code: `@terrain imp\n#end\n`,
      stats: { type: CODE_PAGE_TYPE.TERRAIN, name: 'imp' },
    }
    const message: MESSAGE = {
      session: '',
      player: 'op',
      id: 'm1',
      sender: 'user',
      target: 'loader',
      data: [
        undefined,
        'json',
        'file:demo.t.codepage.json',
        { json: JSON.stringify({ data: cp, exported: 'demo' }) },
      ],
    }
    handleloader(vm, message)
    const gamebook = memoryreadbookbysoftware(MEMORY_LABEL.GAME)
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    expect(memoryreadcodepage(gamebook, 'cp-import-1')).toBeDefined()
    expect(memoryreadcodepage(mainbook, 'cp-import-1')).toBeUndefined()
  })
})
