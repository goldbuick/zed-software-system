import { loadcoolregionsbowelementlibrary } from 'ops/lib/coolregionsbowbook'
import { importzztboardstobook } from 'zss/feature/parse/zzt'
import { zztparseworld } from 'zss/feature/parse/zztbinparse'
import { zztcolorbyte } from 'zss/feature/parse/zztcolor'
import { exportbooktozzt } from 'zss/feature/parse/zztexport'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'
import { READ_LAYER, memoryreadelement } from 'zss/memory/boardaccess'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryreadelementdisplay } from 'zss/memory/bookoperations'
import {
  memoryclearbook,
  memoryresetbooks,
  memorywritebook,
} from 'zss/memory/session'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { COLOR, NAME } from 'zss/words/types'

const ZZT_TILE_DOOR = 9
const ZZT_TILE_KEY = 8

function blankelements(): { type: number; color: number }[] {
  return Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, () => ({
    type: 0,
    color: 0,
  }))
}

function boardwith(boardname: string, elements: ZZT_BOARD['elements']): ZZT_BOARD {
  return {
    boardname,
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

describe('zzt door import', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('maps ZZT bg nibble to cafe key color and black bg', () => {
    const x = 4
    const y = 3
    const elements = blankelements()
    // Classic ZZT blue door: white fg, blue bg nibble
    elements[y * BOARD_WIDTH + x] = {
      type: ZZT_TILE_DOOR,
      color: zztcolorbyte(COLOR.WHITE, COLOR.DKBLUE),
    }

    loadcoolregionsbowelementlibrary()
    const { book, boardaddresses } = importzztboardstobook(
      [boardwith('Doors', elements)],
      {
        tilewidth: BOARD_WIDTH,
        tileheight: BOARD_HEIGHT,
        croppedfromszzt: false,
      },
    )
    memorywritebook(book)

    const memboard = memoryreadboardbyaddress(boardaddresses[0])
    const door = memoryreadelement(memboard, { x, y }, READ_LAYER.ANY)
    expect(NAME(door?.kind ?? '')).toBe('door')
    expect(door?.color).toBe(COLOR.BLUE)
    expect(door?.bg).toBe(COLOR.BLACK)
    expect(door?.displaychar).toBeUndefined()
    expect(door?.displaycolor).toBeUndefined()
    expect(door?.displaybg).toBeUndefined()

    const display = memoryreadelementdisplay(door)
    expect(display.char).toBe(10)
    expect(display.color).toBe(COLOR.BLUE)
    expect(display.bg).toBe(COLOR.BLACK)

    memoryclearbook(book.id)
  })

  it('aligns imported door instance color with the matching key', () => {
    const doorx = 2
    const doory = 2
    const keyx = 4
    const keyy = 2
    const elements = blankelements()
    elements[doory * BOARD_WIDTH + doorx] = {
      type: ZZT_TILE_DOOR,
      color: zztcolorbyte(COLOR.WHITE, COLOR.DKBLUE),
    }
    elements[keyy * BOARD_WIDTH + keyx] = {
      type: ZZT_TILE_KEY,
      color: zztcolorbyte(COLOR.BLUE, COLOR.BLACK),
    }

    loadcoolregionsbowelementlibrary()
    const { book, boardaddresses } = importzztboardstobook(
      [boardwith('KeyDoor', elements)],
      {
        tilewidth: BOARD_WIDTH,
        tileheight: BOARD_HEIGHT,
        croppedfromszzt: false,
      },
    )
    memorywritebook(book)

    const memboard = memoryreadboardbyaddress(boardaddresses[0])
    const door = memoryreadelement(
      memboard,
      { x: doorx, y: doory },
      READ_LAYER.ANY,
    )
    const key = memoryreadelement(memboard, { x: keyx, y: keyy }, READ_LAYER.ANY)
    expect(door?.color).toBe(COLOR.BLUE)
    expect(door?.bg).toBe(COLOR.BLACK)
    expect(key?.color).toBe(COLOR.BLUE)

    memoryclearbook(book.id)
  })

  it('exports object doors with stored color and bg', () => {
    const x = 6
    const y = 4
    const elements = blankelements()
    elements[y * BOARD_WIDTH + x] = {
      type: ZZT_TILE_DOOR,
      color: zztcolorbyte(COLOR.WHITE, COLOR.DKBLUE),
    }

    loadcoolregionsbowelementlibrary()
    const { book } = importzztboardstobook([boardwith('DoorExport', elements)], {
      tilewidth: BOARD_WIDTH,
      tileheight: BOARD_HEIGHT,
      croppedfromszzt: false,
    })
    memorywritebook(book)

    const exported = exportbooktozzt(book)
    expect(exported.ok).toBe(true)
    if (!exported.ok) {
      return
    }

    const parsed = zztparseworld(exported.bytes)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    const tile = parsed.boards[0]?.elements[y * BOARD_WIDTH + x]
    expect(tile?.type).toBe(ZZT_TILE_DOOR)
    expect(tile?.color).toBe(zztcolorbyte(COLOR.WHITE, COLOR.DKBLUE))

    memoryclearbook(book.id)
  })

  it.each([
    [COLOR.DKBLUE, COLOR.BLUE],
    [COLOR.DKGREEN, COLOR.GREEN],
    [COLOR.DKCYAN, COLOR.CYAN],
    [COLOR.DKRED, COLOR.RED],
    [COLOR.DKPURPLE, COLOR.PURPLE],
    [COLOR.DKYELLOW, COLOR.YELLOW],
    [COLOR.LTGRAY, COLOR.WHITE],
  ])(
    'maps bg nibble %s to cafe color %s and round-trips export',
    (zztbg, cafecolor) => {
      const x = 3
      const y = 2
      const elements = blankelements()
      elements[y * BOARD_WIDTH + x] = {
        type: ZZT_TILE_DOOR,
        color: zztcolorbyte(COLOR.WHITE, zztbg),
      }

      loadcoolregionsbowelementlibrary()
      const { book, boardaddresses } = importzztboardstobook(
        [boardwith('DoorNibbles', elements)],
        {
          tilewidth: BOARD_WIDTH,
          tileheight: BOARD_HEIGHT,
          croppedfromszzt: false,
        },
      )
      memorywritebook(book)

      const memboard = memoryreadboardbyaddress(boardaddresses[0])
      const door = memoryreadelement(memboard, { x, y }, READ_LAYER.ANY)
      expect(door?.color).toBe(cafecolor)
      expect(door?.bg).toBe(COLOR.BLACK)

      const exported = exportbooktozzt(book)
      expect(exported.ok).toBe(true)
      if (!exported.ok) {
        return
      }
      const parsed = zztparseworld(exported.bytes)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) {
        return
      }
      const tile = parsed.boards[0]?.elements[y * BOARD_WIDTH + x]
      expect(tile?.type).toBe(ZZT_TILE_DOOR)
      expect(tile?.color).toBe(zztcolorbyte(COLOR.WHITE, zztbg))

      memoryclearbook(book.id)
    },
  )

  it('maps black door nibble 0 to color BLACK and round-trips export', () => {
    const x = 1
    const y = 1
    const elements = blankelements()
    elements[y * BOARD_WIDTH + x] = {
      type: ZZT_TILE_DOOR,
      color: zztcolorbyte(COLOR.WHITE, COLOR.BLACK),
    }

    loadcoolregionsbowelementlibrary()
    const { book, boardaddresses } = importzztboardstobook(
      [boardwith('BlackDoor', elements)],
      {
        tilewidth: BOARD_WIDTH,
        tileheight: BOARD_HEIGHT,
        croppedfromszzt: false,
      },
    )
    memorywritebook(book)

    const memboard = memoryreadboardbyaddress(boardaddresses[0])
    const door = memoryreadelement(memboard, { x, y }, READ_LAYER.ANY)
    expect(door?.color).toBe(COLOR.BLACK)
    expect(door?.bg).toBe(COLOR.BLACK)

    const exported = exportbooktozzt(book)
    expect(exported.ok).toBe(true)
    if (!exported.ok) {
      return
    }
    const parsed = zztparseworld(exported.bytes)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }
    const tile = parsed.boards[0]?.elements[y * BOARD_WIDTH + x]
    expect(tile?.type).toBe(ZZT_TILE_DOOR)
    expect(tile?.color).toBe(zztcolorbyte(COLOR.WHITE, COLOR.BLACK))

    memoryclearbook(book.id)
  })
})
