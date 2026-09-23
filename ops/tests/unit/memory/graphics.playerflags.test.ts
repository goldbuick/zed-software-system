import { memorycreateboard } from 'zss/memory/boardlifecycle'
import {
  memorycreatebook,
  memorywriteflag,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
  memoryreadcodepagestatsfromtext,
} from 'zss/memory/codepageoperations'
import { memoryreadgraphics } from 'zss/memory/rendering'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE, type BOARD } from 'zss/memory/types'
import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'

describe('camera / graphics player flags only', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  function setupbook() {
    const board = memorycreateboard()
    const book = memorycreatebook([
      memorycreatecodepage('@board test\n', { board }),
    ])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    return { book, board }
  }

  it('ignores leftover board camera/graphics fields when flags are unset', () => {
    const { board } = setupbook()
    const leftovers = board as BOARD & {
      camera?: string
      graphics?: string
    }
    leftovers.camera = 'far'
    leftovers.graphics = 'iso'

    const resolved = memoryreadgraphics('pid_player', board)
    expect(resolved.camera).toBe('')
    expect(resolved.graphics).toBe('')
    expect(normalizelayerzvariant(resolved.graphics)).toBe('flat')
  })

  it('uses player flags for camera and graphics', () => {
    const { book, board } = setupbook()
    const leftovers = board as BOARD & {
      camera?: string
      graphics?: string
    }
    leftovers.camera = 'near'
    leftovers.graphics = 'mode7'

    memorywriteflag(book, 'pid_player', 'camera', 'far' as never)
    memorywriteflag(book, 'pid_player', 'graphics', 'iso' as never)

    const resolved = memoryreadgraphics('pid_player', board)
    expect(resolved.camera).toBe('far')
    expect(resolved.graphics).toBe('iso')
  })

  it('still falls back facing to the board when player flag is unset', () => {
    const { board } = setupbook()
    board.facing = 90

    const resolved = memoryreadgraphics('pid_player', board)
    expect(resolved.facing).toBe(90)
  })

  it('does not apply @camera / @graphics from board code pages', () => {
    const stats = memoryreadcodepagestatsfromtext(
      '@board room\n@camera far\n@graphics fpv\n@facing 45\n',
    )
    expect(stats.camera).toBe('far')
    expect(stats.graphics).toBe('fpv')
    expect(stats.facing).toBe(45)

    const page = memorycreatecodepage(
      '@board room\n@camera far\n@graphics fpv\n@facing 45\n',
      {},
    )
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(
      page,
      CODE_PAGE_TYPE.BOARD,
    )
    expect(board?.facing).toBe(45)
    expect(
      (board as BOARD & { camera?: string; graphics?: string })?.camera,
    ).toBeUndefined()
    expect(
      (board as BOARD & { camera?: string; graphics?: string })?.graphics,
    ).toBeUndefined()
  })
})
