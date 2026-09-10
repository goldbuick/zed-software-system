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

// tile type -> expected cafe kind name. every one of these must resolve to a
// codepage in the element library or the tile imports as empty and vanishes.
const EXPECTED_KINDS: [number, string][] = [
  [5, 'ammo'],
  [6, 'torch'],
  [7, 'gem'],
  [8, 'key'],
  [9, 'door'],
  [10, 'scroll'],
  [11, 'passage'],
  [12, 'duplicator'],
  [13, 'bomb'],
  [14, 'energizer'],
  [15, 'star'],
  [16, 'clockwise'],
  [17, 'counter'],
  [18, 'bullet'],
  [19, 'water'],
  [20, 'forest'],
  [21, 'solid'],
  [22, 'normal'],
  [23, 'breakable'],
  [24, 'boulder'],
  [25, 'sliderns'],
  [26, 'sliderew'],
  [27, 'fake'],
  [28, 'invisible'],
  [29, 'blinkwall'],
  [30, 'transporter'],
  [31, 'line'],
  [32, 'ricochet'],
  [33, 'blinkew'],
  [34, 'bear'],
  [35, 'ruffian'],
  [37, 'slime'],
  [38, 'shark'],
  [39, 'spinninggun'],
  [40, 'pusher'],
  [41, 'lion'],
  [42, 'tiger'],
  [43, 'blinkns'],
  [44, 'head'],
  [45, 'segment'],
]

describe('zzt tile import kind names', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('resolves every mapped tile to an element library codepage', () => {
    const elements = Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, () => ({
      type: 0,
      color: 0,
    }))
    const cells: [number, string, number, number][] = EXPECTED_KINDS.map(
      ([type, kind], i) => {
        const x = 1 + (i % (BOARD_WIDTH - 2))
        const y = 1 + Math.floor(i / (BOARD_WIDTH - 2))
        elements[y * BOARD_WIDTH + x] = { type, color: 14 }
        return [type, kind, x, y]
      },
    )

    const board: ZZT_BOARD = {
      boardname: 'Kinds',
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

    loadcoolregionsbowelementlibrary()
    const { book, boardaddresses } = importzztboardstobook([board], {
      tilewidth: BOARD_WIDTH,
      tileheight: BOARD_HEIGHT,
      croppedfromszzt: false,
    })
    memorywritebook(book)

    const memboard = memoryreadboardbyaddress(boardaddresses[0])
    expect(memboard).toBeDefined()

    const missing: string[] = []
    for (const [type, kind, x, y] of cells) {
      const el = memoryreadelement(memboard, { x, y }, READ_LAYER.ANY)
      const got = NAME(el?.kind ?? '')
      if (got !== kind) {
        missing.push(`tile ${type}: expected ${kind}, got "${got}"`)
      }
    }
    expect(missing).toEqual([])

    memoryclearbook(book.id)
  })
})
