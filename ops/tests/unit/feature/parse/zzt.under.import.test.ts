import { loadcoolregionsbowelementlibrary } from 'ops/lib/coolregionsbowbook'
import { importzztboardstobook } from 'zss/feature/parse/zzt'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'
import { memoryreadelement, memoryreadterrain } from 'zss/memory/boardaccess'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import {
  memoryclearbook,
  memoryresetbooks,
  memorywritebook,
} from 'zss/memory/session'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { COLOR, NAME } from 'zss/words/types'

const ZZT_TILE_WATER = 19
const ZZT_TILE_SHARK = 38

describe('zzt under element import', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('writes water terrain under a shark from underelement/undercolor', () => {
    const x = 5
    const y = 4
    const elements = Array.from(
      { length: BOARD_WIDTH * BOARD_HEIGHT },
      () => ({ type: 0, color: 0 }),
    )
    elements[y * BOARD_WIDTH + x] = { type: ZZT_TILE_SHARK, color: 9 }
    // surrounding water (visual context only)
    elements[y * BOARD_WIDTH + (x - 1)] = { type: ZZT_TILE_WATER, color: 0xf9 }
    elements[y * BOARD_WIDTH + (x + 1)] = { type: ZZT_TILE_WATER, color: 0xf9 }

    const board: ZZT_BOARD = {
      boardname: 'Under',
      elements,
      stats: [
        { x: 0, y: 0, cycle: 1, follower: -1, leader: -1, code: '' },
        {
          x,
          y,
          cycle: 3,
          p1: 4,
          follower: -1,
          leader: -1,
          underelement: ZZT_TILE_WATER,
          undercolor: 0x9f,
          code: '',
        },
      ],
      maxplayershots: 255,
      isdark: 0,
      exitnorth: 0,
      exitsouth: 0,
      exitwest: 0,
      exiteast: 0,
      restartonzap: 0,
      messagelength: 0,
      message: '',
      timelimit: 0,
    }

    loadcoolregionsbowelementlibrary()
    const { book, boardaddresses } = importzztboardstobook([board], {
      tilewidth: BOARD_WIDTH,
      tileheight: BOARD_HEIGHT,
      croppedfromszzt: false,
    })
    memorywritebook(book)

    const memboard = memoryreadboardbyaddress(boardaddresses[0])
    expect(memboard).toBeDefined()
    const shark = memoryreadelement(memboard, { x, y })
    expect(NAME(shark?.kind ?? '')).toBe('shark')
    const under = memoryreadterrain(memboard!, x, y)
    expect(NAME(under?.kind ?? '')).toBe('water')
    expect(under?.color).toBe(COLOR.BLWHITE)
    expect(under?.bg).toBe(COLOR.DKBLUE)

    memoryclearbook(book.id)
  })
})
