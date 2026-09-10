import { createsid } from 'zss/mapping/guid'
import { memorycreateboard } from 'zss/memory/boardlifecycle'
import {
  memorycreatebook,
  memoryexportbook,
  memorywriteflag,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import {
  applyexportidremap,
  buildexportidremap,
  collectflagprotectedids,
} from 'zss/memory/exportidremap'
import { memoryresetbooks } from 'zss/memory/session'
import {
  BOARD_ELEMENT_KEYS,
  BOARD_KEYS,
  BOOK_KEYS,
  CODE_PAGE_KEYS,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'

function formatgetvalue(formatted: unknown, key: number): any {
  if (!Array.isArray(formatted)) {
    return undefined
  }
  for (let i = 0; i < formatted.length; i += 2) {
    if (formatted[i] === key) {
      return formatted[i + 1]
    }
  }
  return undefined
}

describe('buildexportidremap', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('remaps a once-only object id and leaves multi-ref ids alone', () => {
    const board = memorycreateboard()
    const shared = createsid()
    const solo = createsid()
    board.objects[shared] = {
      id: shared,
      kind: 'widget',
      x: 2,
      y: 2,
    }
    board.objects[solo] = {
      id: solo,
      kind: 'widget',
      x: 3,
      y: 3,
    }
    // Extra refs so `shared` appears more than once in the wire JSON.
    board.objects[solo].party = shared
    board.objects[solo].group = shared

    const book = memorycreatebook([
      memorycreatecodepage('@board room\n', { board }),
    ])
    const wire = memoryexportbook(book, { noremap: true })!
    const map = buildexportidremap(wire)
    expect(map.has(solo)).toBe(true)
    expect(typeof map.get(solo)).toBe('number')
    expect(map.has(shared)).toBe(false)
  })

  it('remaps page/kind structural alias when id appears exactly twice', () => {
    const kindid = createsid()
    const book = memorycreatebook([
      memorycreatecodepage('@object widget\n@char 2\n', {
        object: { id: kindid, char: 2 },
      }),
    ])
    // Force page id === object kind template id (structural alias).
    book.pages[0].id = kindid
    // Ensure runtime object id matches before export (codepage data path).
    memoryreadcodepagedata(book.pages[0], CODE_PAGE_TYPE.OBJECT)
    const wire = memoryexportbook(book, { noremap: true })!
    const pages = formatgetvalue(wire, BOOK_KEYS.pages)
    const page = pages[0]
    expect(formatgetvalue(page, CODE_PAGE_KEYS.id)).toBe(kindid)
    const object = formatgetvalue(page, CODE_PAGE_KEYS.object)
    expect(formatgetvalue(object, BOARD_ELEMENT_KEYS.id)).toBe(kindid)

    const text = JSON.stringify(wire)
    expect(text.split(kindid).length - 1).toBe(2)

    const map = buildexportidremap(wire)
    expect(map.has(kindid)).toBe(true)
  })

  it('never remaps flag-protected ids', () => {
    const board = memorycreateboard()
    const oid = createsid()
    board.objects[oid] = {
      id: oid,
      kind: 'widget',
      x: 0,
      y: 0,
    }
    const book = memorycreatebook([
      memorycreatecodepage('@board room\n', { board }),
    ])
    memorywriteflag(book, oid, 'score', 1 as any)

    const wire = memoryexportbook(book, { noremap: true })!
    const protectedids = collectflagprotectedids(wire)
    expect(protectedids.has(oid)).toBe(true)

    const map = buildexportidremap(wire)
    expect(map.has(oid)).toBe(false)
  })

  it('applyexportidremap rewrites remapped object ids in place', () => {
    const board = memorycreateboard()
    const solo = createsid()
    board.objects[solo] = {
      id: solo,
      kind: 'widget',
      x: 4,
      y: 5,
    }
    const book = memorycreatebook([
      memorycreatecodepage('@board room\n', { board }),
    ])
    const wire = memoryexportbook(book, { noremap: true })!
    const map = buildexportidremap(wire)
    expect(map.has(solo)).toBe(true)
    applyexportidremap(wire, map)

    const pages = formatgetvalue(wire, BOOK_KEYS.pages)
    const boardwire = formatgetvalue(pages[0], CODE_PAGE_KEYS.board)
    const objects = formatgetvalue(boardwire, BOARD_KEYS.objects) as unknown[]
    const obj = objects.find((row) => {
      const id = formatgetvalue(row, BOARD_ELEMENT_KEYS.id)
      return id === map.get(solo)
    })
    expect(obj).toBeDefined()
  })

  it('one stringify multi-count matches legacy per-id split semantics', () => {
    const board = memorycreateboard()
    const a = createsid()
    const b = createsid()
    board.objects[a] = { id: a, kind: 'widget', x: 0, y: 0 }
    board.objects[b] = {
      id: b,
      kind: 'widget',
      x: 1,
      y: 1,
      p1: a,
    }
    const book = memorycreatebook([
      memorycreatecodepage('@board room\n', { board }),
    ])
    const wire = memoryexportbook(book, { noremap: true })!
    const text = JSON.stringify(wire)
    const legacy = (id: string) => text.split(id).length - 1

    // Rebuild map path: unique candidates counted once against same text.
    const map = buildexportidremap(wire)
    // a appears as object id + as b.p1 → not remapped
    expect(legacy(a)).toBeGreaterThan(1)
    expect(map.has(a)).toBe(false)
    // b appears once as its own id only → remapped
    expect(legacy(b)).toBe(1)
    expect(map.has(b)).toBe(true)
  })
})
