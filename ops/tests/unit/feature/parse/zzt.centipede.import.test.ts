import { loadcoolregionsbowelementlibrary } from 'ops/lib/coolregionsbowbook'
import { importzztboardstobook } from 'zss/feature/parse/zzt'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'
import { memoryreadelement } from 'zss/memory/boardaccess'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import {
  memoryclearbook,
  memoryresetbooks,
  memorywritebook,
} from 'zss/memory/session'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { NAME } from 'zss/words/types'

const ZZT_TILE_HEAD = 44
const ZZT_TILE_SEGMENT = 45

function blankelements(): { type: number; color: number }[] {
  return Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, () => ({
    type: 0,
    color: 0,
  }))
}

describe('zzt centipede Leader/Follower import', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('maps ZZT Follower/Leader indices onto head/segment p3/p4 ids', () => {
    const elements = blankelements()
    const hx = 10
    const hy = 10
    const sx = 10
    const sy = 9
    elements[hy * BOARD_WIDTH + hx] = { type: ZZT_TILE_HEAD, color: 14 }
    elements[sy * BOARD_WIDTH + sx] = { type: ZZT_TILE_SEGMENT, color: 14 }

    // stat 0 = player placeholder (classic ZZT); 1 = head; 2 = segment
    const board: ZZT_BOARD = {
      boardname: 'Centipede',
      elements,
      stats: [
        { x: 0, y: 0, cycle: 1, follower: -1, leader: -1, code: '' },
        {
          x: hx,
          y: hy,
          cycle: 2,
          p1: 4,
          p2: 4,
          follower: 2,
          leader: -1,
        },
        {
          x: sx,
          y: sy,
          cycle: 2,
          follower: -1,
          leader: 1,
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
    if (!memboard) {
      return
    }

    const head = memoryreadelement(memboard, { x: hx, y: hy })
    const seg = memoryreadelement(memboard, { x: sx, y: sy })
    expect(NAME(head?.kind ?? '')).toBe('head')
    expect(NAME(seg?.kind ?? '')).toBe('segment')
    expect(head?.p1).toBe(4)
    expect(head?.p2).toBe(4)
    expect(head?.p3).toBe(seg?.id)
    expect(seg?.p4).toBe(head?.id)
    expect(typeof head?.p3).toBe('string')
    expect(typeof seg?.p4).toBe('string')

    memoryclearbook(book.id)
  })

  it('maps Leader < -1 onto segment p5 linkgrace', () => {
    const elements = blankelements()
    const sx = 5
    const sy = 5
    elements[sy * BOARD_WIDTH + sx] = { type: ZZT_TILE_SEGMENT, color: 14 }

    const board: ZZT_BOARD = {
      boardname: 'Orphan',
      elements,
      stats: [
        { x: 0, y: 0, cycle: 1, follower: -1, leader: -1, code: '' },
        {
          x: sx,
          y: sy,
          cycle: 2,
          follower: -1,
          leader: -2,
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
    const seg = memoryreadelement(memboard, { x: sx, y: sy })
    expect(NAME(seg?.kind ?? '')).toBe('segment')
    expect(seg?.p5).toBe(1)
    expect(seg?.p4).toBeUndefined()

    memoryclearbook(book.id)
  })
})
