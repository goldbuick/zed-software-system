import {
  FORMAT_OBJECT,
  formatobject,
  packformat,
  unpackformat,
} from 'zss/feature/format'
import { creategadgetid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'
import {
  memoryclearbookcodepage,
  memoryclearbookflags,
  memorycreatebook,
  memoryexportbook,
  memoryexportbookasjson,
  memoryimportbook,
  memoryreadbookflags,
  memoryreadcodepage,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import {
  memoryboundariesclear,
  memoryboundaryalloc,
  memoryboundaryget,
} from 'zss/memory/boundaries'
import {
  memorycreatecodepage,
  memoryexportcodepage,
  memoryreadcodepageruntime,
} from 'zss/memory/codepageoperations'
import { memoryfreebook, memoryresetbooks } from 'zss/memory/session'
import { trimformatobject, trimmemoryexport } from 'zss/memory/trimexport'
import { BOOK, BOOK_KEYS } from 'zss/memory/types'

/** Test helper: `memoryexportbook` stores pages as plain JSON; `memoryimportbook` needs per-page wire objects. */
function wirebookforimport(book: BOOK): FORMAT_OBJECT {
  const j = memoryexportbookasjson(book)
  const pageswired = book.pages
    .map((p) => memoryexportcodepage(p))
    .filter(ispresent)
  const wired = formatobject({ ...j, pages: pageswired }, BOOK_KEYS, {})
  if (!ispresent(wired)) {
    throw new Error('wirebookforimport: formatobject failed')
  }
  return wired
}

describe('book opaque boundaries', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('stores code pages on the book; runtime payload at boundaries[codepage.id]', () => {
    const cp = memorycreatecodepage('@board testboard\n', {})
    const book = memorycreatebook([cp])
    expect(book.pages.length).toBe(1)
    expect(book.pages[0]).toBe(cp)
    expect(book.flags).toEqual({})
    expect(memoryreadcodepageruntime(cp)).toEqual({})
    expect(memoryboundaryget(cp.id)).toEqual({})
    expect(memoryreadcodepage(book, cp.id)?.id).toBe(cp.id)
  })

  it('round-trips export and import with embedded pages in wire object', () => {
    const cp = memorycreatecodepage('@object widget\n', {})
    const book = memorycreatebook([cp])
    const exported = wirebookforimport(book)
    const packed = packformat(exported)
    expect(packed).toBeDefined()
    const unpacked = unpackformat(packed!)
    expect(ispresent(unpacked)).toBe(true)
    memoryboundariesclear()
    const again = memoryimportbook(unpacked)
    expect(ispresent(again)).toBe(true)
    expect(again!.pages.length).toBe(1)
    expect(memoryreadcodepage(again, cp.id)?.id).toBe(cp.id)
    const imported = memoryreadcodepage(again, cp.id)
    expect(imported).toBeDefined()
    expect(memoryreadcodepageruntime(imported)).toBeDefined()
    expect(memoryboundaryget(imported!.id)).toBeDefined()
  })

  it('round-trips JSON export/import with board runtime (CLI snapshot shape)', () => {
    const cp = memorycreatecodepage('@board snapjson\n@exitnorth roomn\n', {
      board: {
        id: 'bid',
        name: 'snapboard',
        terrain: [],
        objects: {},
        exitnorth: 'roomn',
      },
    })
    const book = memorycreatebook([cp])
    const rtbefore = memoryreadcodepageruntime(memoryreadcodepage(book, cp.id))
    expect(rtbefore?.board?.exitnorth).toBe('roomn')

    const json = JSON.stringify(wirebookforimport(book))
    memoryboundariesclear()
    memoryresetbooks([])

    const imported = memoryimportbook(JSON.parse(json) as FORMAT_OBJECT)
    expect(ispresent(imported)).toBe(true)
    memoryresetbooks([imported!])

    const cp2 = memoryreadcodepage(imported, cp.id)
    expect(cp2).toBeDefined()
    const rtafter = memoryreadcodepageruntime(cp2)
    expect(rtafter?.board?.exitnorth).toBe('roomn')
  })

  it('mutates flags through boundary-backed record', () => {
    const book = memorycreatebook([])
    const gadgetowner = creategadgetid('testplayer')
    memorywritebookflag(book, gadgetowner, 'x', 42 as any)
    const root = memoryreadbookflags(book, gadgetowner)
    expect(root.x).toBe(42)
    expect(memoryboundaryget(book.flags[gadgetowner])).toBeDefined()
  })

  it('export trim drops cleared empty flags but keeps carry-over stats', () => {
    const book = memorycreatebook([])
    const cleared = 'cleared-player'
    const kept = 'kept-player'

    memorywritebookflag(book, cleared, 'score', 10 as any)
    memoryclearbookflags(book, cleared)

    memorywritebookflag(book, kept, 'deaths', 2 as any)
    memorywritebookflag(book, kept, 'highscore', 99 as any)

    const trimmedjson = trimmemoryexport(memoryexportbookasjson(book))
    expect(trimmedjson.flags[cleared]).toBeUndefined()
    expect(trimmedjson.flags[kept]).toEqual({ deaths: 2, highscore: 99 })

    const trimmedwire = trimformatobject(wirebookforimport(book))
    expect(ispresent(trimmedwire)).toBe(true)
    const packed = packformat(trimmedwire!)
    expect(packed).toBeDefined()

    memoryboundariesclear()
    const again = memoryimportbook(unpackformat(packed!))
    expect(ispresent(again)).toBe(true)
    expect(again!.flags[cleared]).toBeUndefined()
    expect(memoryreadbookflags(again, kept)).toEqual({
      deaths: 2,
      highscore: 99,
    })
  })

  it('export skips rebuildable _gadget and _layers flag caches', () => {
    const book = memorycreatebook([])
    const durable = 'pid_test_player'
    const gadgetowner = creategadgetid(durable)
    const layersowner = `${book.id}_layers`

    memorywritebookflag(book, durable, 'score', 7 as any)
    memorywritebookflag(book, gadgetowner, 'state', { layers: [] } as any)
    memorywritebookflag(book, layersowner, 'normal', { id: 'x' } as any)

    const json = memoryexportbookasjson(book)
    expect(json.flags[durable]).toEqual({ score: 7 })
    expect(json.flags[gadgetowner]).toBeUndefined()
    expect(json.flags[layersowner]).toBeUndefined()

    const wire = memoryexportbook(book)
    expect(ispresent(wire)).toBe(true)
    memoryboundariesclear()
    const again = memoryimportbook(wire)
    expect(ispresent(again)).toBe(true)
    expect(memoryreadbookflags(again, durable)).toEqual({ score: 7 })
    expect(again!.flags[gadgetowner]).toBeUndefined()
    expect(again!.flags[layersowner]).toBeUndefined()
  })

  it('frees nested runtime boundaries when freeing a whole book', () => {
    const boardruntime = 'board-runtime'
    const terrainruntime = 'terrain-runtime'
    const objectruntime = 'object-runtime'
    const pageobjectruntime = 'page-object-runtime'
    const pageterrainruntime = 'page-terrain-runtime'
    memoryboundaryalloc({}, boardruntime)
    memoryboundaryalloc({}, terrainruntime)
    memoryboundaryalloc({}, objectruntime)
    memoryboundaryalloc({}, pageobjectruntime)
    memoryboundaryalloc({}, pageterrainruntime)

    const cp = memorycreatecodepage('@board testboard\n', {
      board: {
        id: 'b',
        name: 'board',
        terrain: [{ runtime: terrainruntime }],
        objects: { oid: { id: 'oid', runtime: objectruntime } },
        runtime: boardruntime,
      },
      object: { id: 'obj', runtime: pageobjectruntime },
      terrain: { runtime: pageterrainruntime },
    })
    const book = memorycreatebook([cp])

    expect(memoryreadcodepageruntime(cp)).toBeDefined()
    expect(memoryboundaryget(boardruntime)).toBeDefined()
    expect(memoryboundaryget(terrainruntime)).toBeDefined()
    expect(memoryboundaryget(objectruntime)).toBeDefined()
    expect(memoryboundaryget(pageobjectruntime)).toBeDefined()
    expect(memoryboundaryget(pageterrainruntime)).toBeDefined()

    memoryfreebook(book)

    expect(book.pages.length).toBe(0)
    expect(memoryboundaryget(cp.id)).toBeUndefined()
    expect(memoryboundaryget(boardruntime)).toBeUndefined()
    expect(memoryboundaryget(terrainruntime)).toBeUndefined()
    expect(memoryboundaryget(objectruntime)).toBeUndefined()
    expect(memoryboundaryget(pageobjectruntime)).toBeUndefined()
    expect(memoryboundaryget(pageterrainruntime)).toBeUndefined()
  })

  it('frees nested runtime boundaries when clearing one codepage', () => {
    const boardruntime = 'board-runtime-clear'
    const objectruntime = 'object-runtime-clear'
    memoryboundaryalloc({}, boardruntime)
    memoryboundaryalloc({}, objectruntime)

    const cp = memorycreatecodepage('@board clearme\n', {
      board: {
        id: 'b2',
        name: 'board2',
        terrain: [],
        objects: {},
        runtime: boardruntime,
      },
      object: { id: 'obj2', runtime: objectruntime },
    })
    const book = memorycreatebook([cp])

    expect(memoryreadcodepageruntime(cp)).toBeDefined()
    expect(memoryboundaryget(boardruntime)).toBeDefined()
    expect(memoryboundaryget(objectruntime)).toBeDefined()

    const removed = memoryclearbookcodepage(book, cp.id)
    expect(removed?.id).toBe(cp.id)
    expect(book.pages.length).toBe(0)
    expect(memoryboundaryget(cp.id)).toBeUndefined()
    expect(memoryboundaryget(boardruntime)).toBeUndefined()
    expect(memoryboundaryget(objectruntime)).toBeUndefined()
  })
})
