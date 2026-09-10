import {
  FORMAT_OBJECT,
  formatobject,
  packformat,
  unpackformat,
} from 'zss/feature/format'
import { creategadgetid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'
import {
  memorydeletecodepage,
  memoryclearflags,
  memorycreatebook,
  memoryexportbook,
  memoryimportbook,
  memoryreadflags,
  memoryreadcodepage,
  memorywriteflag,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryexportcodepage,
} from 'zss/memory/codepageoperations'
import {
  memoryfreebook,
  memoryresetbooks,
} from 'zss/memory/session'
import {
  trimformatobject,
  trimmemoryexport,
} from 'zss/memory/trimexport'
import {
  BOOK,
  BOOK_KEYS,
} from 'zss/memory/types'
/** Test helper: json book export; wrap pages as wire for wire import. */
function wirebookforimport(book: BOOK): FORMAT_OBJECT {
  const j = memoryexportbook(book, { format: 'json' })
  const pageswired = book.pages
    .map((p) => memoryexportcodepage(p))
    .filter(ispresent)
  const wired = formatobject({ ...j, pages: pageswired }, BOOK_KEYS, {})
  if (!ispresent(wired)) {
    throw new Error('wirebookforimport: formatobject failed')
  }
  return wired
}

describe('book import export and flags', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('stores code pages on the book with payload on the page', () => {
    const cp = memorycreatecodepage('@board testboard\n', {})
    const book = memorycreatebook([cp])
    expect(book.pages.length).toBe(1)
    expect(book.pages[0]).toBe(cp)
    expect(book.flags).toEqual({})
    expect(cp.board).toBeUndefined()
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
    const again = memoryimportbook(unpacked)
    expect(ispresent(again)).toBe(true)
    expect(again!.pages.length).toBe(1)
    expect(memoryreadcodepage(again, cp.id)?.id).toBe(cp.id)
    const imported = memoryreadcodepage(again, cp.id)
    expect(imported).toBeDefined()
    expect(imported!.id).toBe(cp.id)
  })

  it('round-trips JSON export/import with board payload (CLI snapshot shape)', () => {
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
    expect(memoryreadcodepage(book, cp.id)?.board?.exitnorth).toBe('roomn')

    const json = JSON.stringify(wirebookforimport(book))
    memoryresetbooks([])

    const imported = memoryimportbook(JSON.parse(json) as FORMAT_OBJECT)
    expect(ispresent(imported)).toBe(true)
    memoryresetbooks([imported!])

    const cp2 = memoryreadcodepage(imported, cp.id)
    expect(cp2).toBeDefined()
    expect(cp2?.board?.exitnorth).toBe('roomn')
  })

  it('mutates flags through inline flag bags', () => {
    const book = memorycreatebook([])
    const gadgetowner = creategadgetid('testplayer')
    memorywriteflag(book, gadgetowner, 'x', 42 as any)
    const root = memoryreadflags(book, gadgetowner)
    expect(root.x).toBe(42)
    expect(book.flags[gadgetowner]).toBe(root)
  })

  it('export trim drops cleared empty flags but keeps carry-over stats', () => {
    const book = memorycreatebook([])
    const cleared = 'cleared-player'
    const kept = 'kept-player'

    memorywriteflag(book, cleared, 'score', 10 as any)
    memoryclearflags(book, cleared)

    memorywriteflag(book, kept, 'deaths', 2 as any)
    memorywriteflag(book, kept, 'highscore', 99 as any)

    const trimmedjson = trimmemoryexport(memoryexportbook(book, { format: 'json' }))
    expect(trimmedjson.flags[cleared]).toBeUndefined()
    expect(trimmedjson.flags[kept]).toEqual({ deaths: 2, highscore: 99 })

    const trimmedwire = trimformatobject(wirebookforimport(book))
    expect(ispresent(trimmedwire)).toBe(true)
    const packed = packformat(trimmedwire!)
    expect(packed).toBeDefined()

    const again = memoryimportbook(unpackformat(packed!))
    expect(ispresent(again)).toBe(true)
    expect(again!.flags[cleared]).toBeUndefined()
    expect(memoryreadflags(again, kept)).toEqual({
      deaths: 2,
      highscore: 99,
    })
  })

  it('export skips rebuildable _gadget and _layers flag caches', () => {
    const book = memorycreatebook([])
    const durable = 'pid_test_player'
    const gadgetowner = creategadgetid(durable)
    const layersowner = `${book.id}_layers`

    memorywriteflag(book, durable, 'score', 7 as any)
    memorywriteflag(book, gadgetowner, 'state', { layers: [] } as any)
    memorywriteflag(book, layersowner, 'normal', { id: 'x' } as any)

    const json = memoryexportbook(book, { format: 'json' })
    expect(json.flags[durable]).toEqual({ score: 7 })
    expect(json.flags[gadgetowner]).toBeUndefined()
    expect(json.flags[layersowner]).toBeUndefined()

    const wire = memoryexportbook(book)
    expect(ispresent(wire)).toBe(true)
    const again = memoryimportbook(wire)
    expect(ispresent(again)).toBe(true)
    expect(memoryreadflags(again, durable)).toEqual({ score: 7 })
    expect(again!.flags[gadgetowner]).toBeUndefined()
    expect(again!.flags[layersowner]).toBeUndefined()
  })

  it('frees pages and clears flags when freeing a whole book', () => {
    const cp = memorycreatecodepage('@board testboard\n', {
      board: {
        id: 'b',
        name: 'board',
        terrain: [],
        objects: { oid: { id: 'oid', char: 1 } },
      },
      object: { id: 'obj', char: 2 },
      terrain: { char: 3 },
    })
    const book = memorycreatebook([cp])
    memorywriteflag(book, 'pid', 'score', 1 as any)

    expect(book.pages.length).toBe(1)
    expect(cp.board).toBeDefined()
    expect(Object.keys(book.flags).length).toBeGreaterThan(0)

    memoryfreebook(book)

    expect(book.pages.length).toBe(0)
    expect(book.flags).toEqual({})
  })

  it('removes the page when clearing one codepage', () => {
    const cp = memorycreatecodepage('@board clearme\n', {
      board: {
        id: 'b2',
        name: 'board2',
        terrain: [],
        objects: {},
      },
      object: { id: 'obj2', char: 4 },
    })
    const book = memorycreatebook([cp])

    expect(book.pages.length).toBe(1)
    expect(cp.board).toBeDefined()

    const removed = memorydeletecodepage(book, cp.id)
    expect(removed?.id).toBe(cp.id)
    expect(book.pages.length).toBe(0)
    expect(memoryreadcodepage(book, cp.id)).toBeUndefined()
  })
})
