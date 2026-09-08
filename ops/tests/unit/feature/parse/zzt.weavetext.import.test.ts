import { loadcoolregionsbowelementlibrary } from 'ops/lib/coolregionsbowbook'
import { importzztboardstobook } from 'zss/feature/parse/zzt'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'
import { memoryreadelement } from 'zss/memory/boardaccess'
import { memoryreadelementstat, memoryreadboardbyaddress } from 'zss/memory/boards'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import {
  memoryclearbook,
  memoryreadbooklist,
  memoryresetbooks,
  memorywritebook,
} from 'zss/memory/session'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { COLOR, NAME } from 'zss/words/types'

function emptyelements() {
  return Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, () => ({
    type: 0,
    color: 0,
  }))
}

function makeboard(
  cells: { x: number; y: number; type: number; color: number }[],
): ZZT_BOARD {
  const elements = emptyelements()
  for (const cell of cells) {
    elements[cell.y * BOARD_WIDTH + cell.x] = {
      type: cell.type,
      color: cell.color,
    }
  }
  return {
    boardname: 'WeaveText',
    elements,
    stats: [{ x: 0, y: 0, cycle: 1, follower: -1, leader: -1, code: '' }],
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
}

describe('zzt Weave text import', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('imports mid-gap, fancy, and classic text tiles', () => {
    loadcoolregionsbowelementlibrary()
    const lib = memoryreadbooklist()[0]
    expect(lib).toBeDefined()
    memorywritecodepage(
      lib,
      memorycreatecodepage('@terrain customtext\n@issolid\n@color blwhite\n', {}),
    )

    const cells = [
      { x: 2, y: 2, type: 100, color: 65 }, // mid-gap -> customtext, char 65
      { x: 3, y: 2, type: 128, color: 66 }, // fancy attr 0
      { x: 4, y: 2, type: 143, color: 67 }, // fancy attr 15
      { x: 5, y: 2, type: 47, color: 68 }, // classic bluetext
    ]

    const { book, boardaddresses } = importzztboardstobook([makeboard(cells)], {
      tilewidth: BOARD_WIDTH,
      tileheight: BOARD_HEIGHT,
      croppedfromszzt: false,
    })
    memorywritebook(book)

    const memboard = memoryreadboardbyaddress(boardaddresses[0])
    expect(memboard).toBeDefined()

    const mid = memoryreadelement(memboard, { x: 2, y: 2 })
    expect(NAME(mid?.kind ?? '')).toBe('customtext')
    expect(mid?.char).toBe(65)

    const fancy0 = memoryreadelement(memboard, { x: 3, y: 2 })
    expect(NAME(fancy0?.kind ?? '')).toBe('text')
    expect(fancy0?.char).toBe(66)
    expect(memoryreadelementstat(fancy0, 'color')).toBe(COLOR.BLACK)
    expect(memoryreadelementstat(fancy0, 'bg')).toBe(COLOR.BLACK)

    const fancy15 = memoryreadelement(memboard, { x: 4, y: 2 })
    expect(NAME(fancy15?.kind ?? '')).toBe('text')
    expect(fancy15?.char).toBe(67)
    expect(memoryreadelementstat(fancy15, 'color')).toBe(COLOR.WHITE)
    expect(memoryreadelementstat(fancy15, 'bg')).toBe(COLOR.BLACK)

    const classic = memoryreadelement(memboard, { x: 5, y: 2 })
    expect(NAME(classic?.kind ?? '')).toBe('text')
    expect(classic?.char).toBe(68)
    // type 47 -> (47-46)*16+15 = 31 -> fg 15 white, bg 1 dkblue
    expect(memoryreadelementstat(classic, 'color')).toBe(COLOR.WHITE)
    expect(memoryreadelementstat(classic, 'bg')).toBe(COLOR.DKBLUE)

    memoryclearbook(book.id)
  })
})
