import { boardremix } from 'zss/feature/boardremix'
import { pttoindex } from 'zss/mapping/2d'
import { READ_LAYER, memoryreadelement } from 'zss/memory/boardaccess'
import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
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

jest.mock('zss/feature/wfcoverlapping', () => ({
  wfcoverlappinggenerate: (
    _data: Uint8Array,
    _boardwidth: number,
    _boardheight: number,
    _patternsize: number,
    genwidth: number,
    genheight: number,
  ) => {
    // kind alpha 0 = first kind scanned on source (foe object at 0,0)
    return new Uint8Array(genwidth * genheight * 4)
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

describe('boardremix runtime', () => {
  afterEach(() => {
    memoryresetbooks([])
    READ_CONTEXT.book = undefined
  })

  it('preserves invoker and skips stacking an object on its cell', () => {
    const srctile = makewallterrain(0, 0)
    const srcboard = makeboard('srcboard', srctile)
    const dstboard = makeboard('dstboard')

    const wallcp = memorycreatecodepage('@terrain wall\n', {
      terrain: { id: 'wall', name: 'wall', kind: 'wall' },
    })
    const runnercp = memorycreatecodepage('@object runner\n', {
      object: { id: 'runnerkind', name: 'runner', kind: 'runner' },
    })
    const foecp = memorycreatecodepage('@object foe\n', {
      object: { id: 'foekind', name: 'foe', kind: 'foe' },
    })
    const srccp = memorycreatecodepage('@board srcboard\n', { board: srcboard })
    const dstcp = memorycreatecodepage('@board dstboard\n', { board: dstboard })
    const book = memorycreatebook([wallcp, runnercp, foecp, srccp, dstcp])
    book.timestamp = 10
    memoryresetbooks([book])
    READ_CONTEXT.book = book

    const invoker = memorycreateboardobjectfromkind(
      dstboard,
      { x: 0, y: 0 },
      'runner',
    )
    expect(invoker?.id).toBeTruthy()
    const other = memorycreateboardobjectfromkind(
      dstboard,
      { x: 1, y: 0 },
      'foe',
    )
    expect(other?.id).toBeTruthy()

    const srcfoe = memorycreateboardobjectfromkind(
      srcboard,
      { x: 0, y: 0 },
      'foe',
    )
    expect(srcfoe?.id).toBeTruthy()

    expect(
      boardremix(
        'dstboard',
        'srcboard',
        1,
        0,
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        'all',
        invoker!.id!,
      ),
    ).toBe(true)

    expect(invoker!.removed).toBeUndefined()
    expect(other!.removed).toBe(10)
    const atinvoker = memoryreadelement(
      dstboard,
      { x: 0, y: 0 },
      READ_LAYER.OBJECT,
    )
    expect(atinvoker?.id).toBe(invoker!.id)
    const stacked = Object.values(dstboard.objects).filter(
      (el) => el.x === 0 && el.y === 0 && !el.removed,
    )
    expect(stacked).toHaveLength(1)
  })
})
