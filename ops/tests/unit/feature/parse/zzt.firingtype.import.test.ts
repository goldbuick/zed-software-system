import { loadcoolregionsbowelementlibrary } from 'ops/lib/coolregionsbowbook'
import { importzztboardstobook } from 'zss/feature/parse/zzt'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'
import { READ_LAYER, memoryreadelement } from 'zss/memory/boardaccess'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import {
  memoryclearbook,
  memoryresetbooks,
  memorywritebook,
} from 'zss/memory/session'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { NAME } from 'zss/words/types'

const ZZT_TILE_SPINNINGGUN = 39
const ZZT_TILE_TIGER = 42

function blankelements(): { type: number; color: number }[] {
  return Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, () => ({
    type: 0,
    color: 0,
  }))
}

describe('zzt tiger/spinninggun P2 firing-type import', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('splits P2 star bit into p3 and masks rate for tiger', () => {
    const elements = blankelements()
    const x = 5
    const y = 5
    elements[y * BOARD_WIDTH + x] = { type: ZZT_TILE_TIGER, color: 14 }

    const board: ZZT_BOARD = {
      boardname: 'TigerFire',
      elements,
      stats: [
        { x: 0, y: 0, cycle: 1, follower: -1, leader: -1, code: '' },
        {
          x,
          y,
          cycle: 2,
          p1: 4,
          // rate 5 + star bit ($80)
          p2: 0x80 | 5,
          p3: 0,
          follower: -1,
          leader: -1,
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
    const el = memoryreadelement(memboard, { x, y }, READ_LAYER.OBJECT)
    expect(NAME(el?.kind ?? '')).toBe('tiger')
    expect(el?.p2).toBe(5)
    expect(el?.p3).toBe(1)

    memoryclearbook(book.id)
  })

  it('maps bullet-mode spinninggun P2 without star bit', () => {
    const elements = blankelements()
    const x = 3
    const y = 4
    elements[y * BOARD_WIDTH + x] = { type: ZZT_TILE_SPINNINGGUN, color: 14 }

    const board: ZZT_BOARD = {
      boardname: 'GunFire',
      elements,
      stats: [
        { x: 0, y: 0, cycle: 1, follower: -1, leader: -1, code: '' },
        {
          x,
          y,
          cycle: 2,
          p1: 4,
          p2: 12,
          p3: 99,
          follower: -1,
          leader: -1,
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
    const el = memoryreadelement(memboard, { x, y }, READ_LAYER.OBJECT)
    expect(NAME(el?.kind ?? '')).toBe('spinninggun')
    expect(el?.p2).toBe(12)
    expect(el?.p3).toBe(0)

    memoryclearbook(book.id)
  })
})
