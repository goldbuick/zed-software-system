import { packformat, unpackformat } from 'zss/feature/format'
import { pttoindex } from 'zss/mapping/2d'
import { ispresent } from 'zss/mapping/types'
import {
  memoryexportboard,
  memoryexportboardasjson,
  memoryimportboard,
} from 'zss/memory/boardlifecycle'
import {
  memorycreateterrainexportmode,
  memoryinternterraindisplay,
  memorystripterrainkinddefaults,
  memoryunpackterraindisplay,
} from 'zss/memory/boardterrainmap'
import { memoryreadelementkind } from 'zss/memory/boards'
import {
  memorycreatebook,
  memoryexportbook,
  memoryexportbookasjson,
  memoryimportbook,
  memoryimportbookfromjson,
  memoryreadelementdisplay,
} from 'zss/memory/bookoperations'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreatecodepage,
  memoryreadcodepageruntime,
} from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import type { BOARD, BOARD_ELEMENT, BOOK, CODE_PAGE } from 'zss/memory/types'
import { BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'

/** `@terrain wall` kind values every test measures against. */
const WALL_KIND = { char: 219, color: 2, bg: 0 }

function makecell(
  x: number,
  display: { char?: number; color?: number; bg?: number },
  kind = 'wall',
): BOARD_ELEMENT {
  return { x, y: 0, kind, runtime: '', ...display }
}

function makeboard(id: string, cells: BOARD_ELEMENT[]): BOARD {
  const terrain = new Array<BOARD_ELEMENT | undefined>(BOARD_SIZE)
  for (let i = 0; i < cells.length; ++i) {
    const cell = cells[i]
    terrain[pttoindex({ x: cell.x ?? 0, y: cell.y ?? 0 }, BOARD_WIDTH)] = cell
  }
  return { id, name: id, terrain, objects: {}, runtime: '' }
}

/** Book with a `@terrain wall` kind page plus one board page per entry. */
function makebook(boards: BOARD[]): BOOK {
  const wallcp = memorycreatecodepage('@terrain wall\n', {
    terrain: { id: 'wall', name: 'wall', ...WALL_KIND, runtime: '' },
  })
  const pages: CODE_PAGE[] = [wallcp]
  for (let i = 0; i < boards.length; ++i) {
    pages.push(
      memorycreatecodepage(`@board ${boards[i].id}\n`, { board: boards[i] }),
    )
  }
  const book = memorycreatebook(pages)
  memoryresetbooks([book])
  return book
}

/** Resolves kinddata first, the way memoryinitboard does before rendering. */
function readdisplay(cell: BOARD_ELEMENT) {
  memoryreadelementkind(cell)
  return memoryreadelementdisplay(cell)
}

function readboards(book: BOOK): BOARD[] {
  const boards: BOARD[] = []
  for (let i = 0; i < book.pages.length; ++i) {
    const board = memoryreadcodepageruntime(book.pages[i])?.board
    if (ispresent(board)) {
      boards.push(board)
    }
  }
  return boards
}

function readcells(board: BOARD): BOARD_ELEMENT[] {
  return board.terrain.filter(ispresent)
}

/** Simulates a disk round trip so import cannot alias the exported graph. */
function throughdisk(value: any): any {
  return JSON.parse(JSON.stringify(value))
}

describe('terrain display strip', () => {
  afterEach(() => {
    memoryresetbooks([])
    memoryboundariesclear()
  })

  it('drops display stats matching the kind and keeps the rest', () => {
    makebook([])
    const cell = makecell(0, { char: 219, color: 4, bg: 0 })

    const stripped = memorystripterrainkinddefaults(cell)

    expect(stripped?.char).toBeUndefined()
    expect(stripped?.color).toBe(4)
    expect(stripped?.bg).toBeUndefined()
    // the live cell must not be mutated
    expect(cell.char).toBe(219)
    expect(cell.bg).toBe(0)
  })

  it('keeps every stat when no kind resolves', () => {
    makebook([])
    const cell = makecell(0, { char: 219, color: 2, bg: 0 }, 'nosuchkind')

    expect(memorystripterrainkinddefaults(cell)).toBe(cell)
  })

  it('keeps every stat when the kind carries no display values', () => {
    const bareterrain = memorycreatecodepage('@terrain bare\n', {
      terrain: { id: 'bare', name: 'bare', runtime: '' },
    })
    memoryresetbooks([memorycreatebook([bareterrain])])
    const cell = makecell(0, { char: 5, color: 1, bg: 0 }, 'bare')

    expect(memorystripterrainkinddefaults(cell)).toBe(cell)
  })
})

describe('terrain display intern', () => {
  it('reuses one index per distinct triple', () => {
    const mode = memorycreateterrainexportmode(true)

    const first = memoryinternterraindisplay(makecell(0, { char: 2, color: 0 }), mode)
    const second = memoryinternterraindisplay(makecell(1, { char: 2, color: 0 }), mode)

    expect(first?.dmap).toBe(0)
    expect(second?.dmap).toBe(0)
    expect(first?.char).toBeUndefined()
    expect(first?.color).toBeUndefined()
    expect(mode.entries).toEqual([{ char: 2, color: 0 }])
  })

  it('separates partial triples from full ones', () => {
    const mode = memorycreateterrainexportmode(true)

    const partial = memoryinternterraindisplay(makecell(0, { char: 2 }), mode)
    const full = memoryinternterraindisplay(makecell(1, { char: 2, color: 0 }), mode)

    expect(partial?.dmap).toBe(0)
    expect(full?.dmap).toBe(1)
    expect(mode.entries).toEqual([{ char: 2 }, { char: 2, color: 0 }])
  })

  it('leaves cells without display stats alone', () => {
    const mode = memorycreateterrainexportmode(true)
    const cell = makecell(0, {})

    expect(memoryinternterraindisplay(cell, mode)).toBe(cell)
    expect(mode.entries).toEqual([])
  })

  it('does not intern when the mode is strip only', () => {
    const mode = memorycreateterrainexportmode(false)
    const cell = makecell(0, { char: 7 })

    expect(memoryinternterraindisplay(cell, mode)).toBe(cell)
    expect(mode.entries).toEqual([])
  })
})

describe('terrain display unpack', () => {
  it('restores stats and removes dmap', () => {
    const board = makeboard('b', [{ x: 0, y: 0, kind: 'wall', dmap: 0 }])

    memoryunpackterraindisplay(board, [{ char: 4, color: 1 }])

    const cell = readcells(board)[0]
    expect(cell.char).toBe(4)
    expect(cell.color).toBe(1)
    expect(cell.bg).toBeUndefined()
    expect('dmap' in cell).toBe(false)
  })

  it('is a no-op without a table', () => {
    const board = makeboard('b', [makecell(0, { char: 9 })])

    memoryunpackterraindisplay(board, undefined)

    expect(readcells(board)[0].char).toBe(9)
  })
})

describe('book export dedupe', () => {
  afterEach(() => {
    memoryresetbooks([])
    memoryboundariesclear()
  })

  it('shares one table entry across boards in the same book', () => {
    const book = makebook([
      makeboard('one', [makecell(0, { char: 219, color: 4, bg: 0 })]),
      makeboard('two', [makecell(3, { char: 219, color: 4, bg: 0 })]),
    ])

    const exported = memoryexportbookasjson(book)

    expect(exported.terrainmap).toEqual([{ color: 4 }])
    const cells = exported.pages
      .filter((page: any) => ispresent(page.board))
      .map((page: any) => page.board.terrain.filter(ispresent)[0])
    expect(cells).toHaveLength(2)
    expect(cells[0].dmap).toBe(0)
    expect(cells[1].dmap).toBe(0)
    expect(cells[0].char).toBeUndefined()
  })

  it('omits the table when nothing needs it', () => {
    const book = makebook([makeboard('one', [makecell(0, WALL_KIND)])])

    const exported = memoryexportbookasjson(book)

    expect(exported.terrainmap).toBeUndefined()
  })

  it('leaves display stats verbatim when no mode is given', () => {
    makebook([])
    const board = makeboard('one', [makecell(0, { char: 219, color: 2, bg: 0 })])

    const exported = memoryexportboardasjson(board)

    const cell = exported.terrain.filter(ispresent)[0]
    expect(cell.char).toBe(219)
    expect(cell.color).toBe(2)
    expect(cell.dmap).toBeUndefined()
  })

  it('strips but does not intern for a strip only mode', () => {
    makebook([])
    const board = makeboard('one', [makecell(0, { char: 219, color: 4, bg: 0 })])

    const exported = memoryexportboardasjson(
      board,
      memorycreateterrainexportmode(false),
    )

    const cell = exported.terrain.filter(ispresent)[0]
    expect(cell.char).toBeUndefined()
    expect(cell.color).toBe(4)
    expect(cell.dmap).toBeUndefined()
  })
})

describe('book dedupe round trip', () => {
  afterEach(() => {
    memoryresetbooks([])
    memoryboundariesclear()
  })

  const CELLS = [
    { char: 219, color: 2, bg: 0 },
    { char: 219, color: 4, bg: 0 },
    { char: 176, color: 8, bg: 1 },
    {},
  ]

  function makeroundtripboard(id: string): BOARD {
    return makeboard(
      id,
      CELLS.map((display, index) => makecell(index, display)),
    )
  }

  it('preserves display through json export and import', () => {
    const book = makebook([makeroundtripboard('one')])
    const before = readcells(readboards(book)[0]).map(readdisplay)

    const exported = throughdisk(memoryexportbookasjson(book))
    expect(exported.terrainmap.length).toBeGreaterThan(0)

    memoryboundariesclear()
    const imported = memoryimportbookfromjson(exported)
    expect(ispresent(imported)).toBe(true)
    memoryresetbooks([imported!])

    const after = readcells(readboards(imported!)[0]).map(readdisplay)
    expect(after).toEqual(before)
  })

  it('preserves display through msgpack export and import', () => {
    const book = makebook([makeroundtripboard('one')])
    const before = readcells(readboards(book)[0]).map(readdisplay)

    const exported = memoryexportbook(book)
    const packed = packformat(exported!)
    expect(ispresent(packed)).toBe(true)
    const unpacked = unpackformat(packed!)

    memoryboundariesclear()
    const imported = memoryimportbook(unpacked)
    expect(ispresent(imported)).toBe(true)
    memoryresetbooks([imported!])

    const after = readcells(readboards(imported!)[0]).map(readdisplay)
    expect(after).toEqual(before)
    for (const cell of readcells(readboards(imported!)[0])) {
      expect('dmap' in cell).toBe(false)
    }
  })

  /** boardpivot uses the export/import pair as an in-memory rollback snapshot. */
  it('restores identical cells through a verbatim export and import', () => {
    makebook([])
    const board = makeroundtripboard('one')
    // terrain x / y and runtime are not persisted; memoryinitboardlookup rebuilds them
    const readpayload = (cells: BOARD_ELEMENT[]) =>
      cells.map(({ runtime: _r, x: _x, y: _y, ...rest }) => rest)
    const before = readpayload(readcells(board))

    const restored = memoryimportboard(memoryexportboard(board))

    expect(readpayload(readcells(restored!))).toEqual(before)
  })

  it('imports a legacy book that has literal stats and no table', () => {
    const book = makebook([makeroundtripboard('one')])
    const exported = throughdisk(memoryexportbookasjson(book))
    const before = readcells(readboards(book)[0]).map(readdisplay)

    // rebuild the pre-dedupe shape: literal stats on every cell, no table
    const legacy = throughdisk(exported)
    delete legacy.terrainmap
    for (const page of legacy.pages) {
      if (!ispresent(page.board)) {
        continue
      }
      page.board.terrain = page.board.terrain.map(
        (cell: any, index: number) => {
          if (!ispresent(cell)) {
            return cell
          }
          const { dmap, ...rest } = cell
          return ispresent(dmap) ? { ...rest, ...CELLS[index] } : cell
        },
      )
    }

    memoryboundariesclear()
    const imported = memoryimportbookfromjson(legacy)
    memoryresetbooks([imported!])

    const cells = readcells(readboards(imported!)[0])
    expect(cells.map(readdisplay)).toEqual(before)
    expect(cells[2].char).toBe(176)
  })
})
