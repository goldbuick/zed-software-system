import { boardcopy, mapelementcopy } from 'zss/feature/boardcopy'
import { pttoindex } from 'zss/mapping/2d'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import { BOARD, BOARD_ELEMENT, BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { CATEGORY } from 'zss/words/types'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  DEBUG_SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 0,
    DRAW_CHAR_HEIGHT: () => 0,
  },
}))

function makewallterrain(x: number, y: number): BOARD_ELEMENT {
  const tile: BOARD_ELEMENT = {
    x,
    y,
    kind: 'wall',
    char: 219,
    color: 2,
  }
  Object.assign(tile, {
    category: CATEGORY.ISTERRAIN,
    kinddata: { id: 'wall', name: 'wall', char: 219 },
  })
  return tile
}

function makeboard(id: string, terrainat?: BOARD_ELEMENT): BOARD {
  const terrain = new Array<BOARD_ELEMENT | undefined>(BOARD_SIZE)
  if (terrainat) {
    terrain[
      pttoindex({ x: terrainat.x ?? 0, y: terrainat.y ?? 0 }, BOARD_WIDTH)
    ] = terrainat
  }
  return {
    id,
    name: id,
    terrain,
    objects: {},
  }
}

describe('boardcopy runtime', () => {
  afterEach(() => {
    memoryresetbooks([])
    READ_CONTEXT.book = undefined
  })

  it('mapelementcopy clones kinddata onto dest without aliasing', () => {
    const src = makewallterrain(0, 0)
    const dest: BOARD_ELEMENT = { x: 1, y: 0, kind: 'wall' }
    Object.assign(dest, { category: CATEGORY.ISTERRAIN })

    mapelementcopy(dest, src)

    expect(dest.char).toBe(219)
    expect(dest.kinddata?.name).toBe('wall')
    expect(dest.kinddata).not.toBe(src.kinddata)
  })

  it('boardcopy clones kinddata onto dest terrain without aliasing', () => {
    const srctile = makewallterrain(0, 0)
    const srcboard = makeboard('srcboard', srctile)
    const dstboard = makeboard('dstboard')

    const wallcp = memorycreatecodepage('@terrain wall\n', {
      terrain: { id: 'wall', name: 'wall', kind: 'wall' },
    })
    const srccp = memorycreatecodepage('@board srcboard\n', { board: srcboard })
    const dstcp = memorycreatecodepage('@board dstboard\n', { board: dstboard })
    const book = memorycreatebook([wallcp, srccp, dstcp])
    memoryresetbooks([book])
    READ_CONTEXT.book = book

    expect(
      boardcopy(
        'srcboard',
        'dstboard',
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        'terrain',
      ),
    ).toBe(true)

    const copied = dstboard.terrain[0]
    expect(copied).toBeDefined()
    expect(copied!.kinddata?.name).toBe('wall')
    expect(copied!.kinddata).not.toBe(srctile.kinddata)
    expect(copied!.char).toBe(219)
  })
})
