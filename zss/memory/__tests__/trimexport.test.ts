import {
  FORMAT_OBJECT,
  formatobject,
  packformat,
  unpackformat,
} from 'zss/feature/format'
import { ispresent } from 'zss/mapping/types'
import {
  memorycreatebook,
  memoryexportbook,
  memoryexportbookasjson,
  memoryimportbook,
  memoryreadcodepage,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreatecodepage,
  memoryexportcodepage,
  memoryreadcodepageruntime,
} from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import { trimformatobject, trimmemoryexport } from 'zss/memory/trimexport'
import { BOOK, BOOK_KEYS } from 'zss/memory/types'

function wiretrimmedbookforimport(book: BOOK): FORMAT_OBJECT {
  const j = trimmemoryexport(memoryexportbookasjson(book)) ?? {}
  const pageswired = book.pages
    .map((p) => memoryexportcodepage(p))
    .filter(ispresent)
  const wired = trimformatobject(
    formatobject({ ...j, pages: pageswired }, BOOK_KEYS, {}),
  )
  if (!ispresent(wired)) {
    throw new Error('wiretrimmedbookforimport: formatobject failed')
  }
  return wired
}

describe('trimexport', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  describe('trimmemoryexport', () => {
    it('removes undefined keys', () => {
      expect(trimmemoryexport({ a: undefined, b: 1 })).toEqual({ b: 1 })
    })

    it('removes empty object keys', () => {
      expect(trimmemoryexport({ a: {}, b: 1 })).toEqual({ b: 1 })
    })

    it('returns undefined for all-empty objects', () => {
      expect(trimmemoryexport({ a: {}, b: { c: {} } })).toBeUndefined()
    })

    it('trims nested flag maps', () => {
      expect(
        trimmemoryexport({
          p1: {},
          p2: { deaths: 2 },
        }),
      ).toEqual({ p2: { deaths: 2 } })
    })

    it('returns undefined for undefined input', () => {
      expect(trimmemoryexport(undefined)).toBeUndefined()
    })
  })

  describe('trimformatobject', () => {
    it('omits pairs with undefined or empty object values', () => {
      const formatted = [
        'a',
        1,
        'b',
        {},
        'c',
        undefined,
        'd',
        2,
      ] as unknown as FORMAT_OBJECT
      expect(trimformatobject(formatted)).toEqual(['a', 1, 'd', 2])
    })

    it('trims nested plain objects', () => {
      const formatted = [
        'flags',
        { p1: {}, p2: { deaths: 2 } },
      ] as FORMAT_OBJECT
      expect(trimformatobject(formatted)).toEqual([
        'flags',
        { p2: { deaths: 2 } },
      ])
    })

    it('recurses into nested FORMAT_OBJECT values', () => {
      const nested = ['x', {}, 'y', 3] as unknown as FORMAT_OBJECT
      const formatted = [
        'meta',
        nested,
        'id',
        'abc',
      ] as unknown as FORMAT_OBJECT
      expect(trimformatobject(formatted)).toEqual([
        'meta',
        ['y', 3],
        'id',
        'abc',
      ])
    })
  })

  describe('book export round-trip', () => {
    it('round-trips meaningful book data after trim', () => {
      const cp = memorycreatecodepage('@board snap\n@exitnorth roomn\n', {
        board: {
          id: 'bid',
          name: 'snapboard',
          terrain: [],
          objects: {},
          exitnorth: 'roomn',
        },
      })
      const book = memorycreatebook([cp])
      memorywritebookflag(book, 'player-with-stats', 'deaths', 3 as any)

      const trimmed = trimformatobject(memoryexportbook(book))
      expect(ispresent(trimmed)).toBe(true)

      const packed = packformat(trimmed!)
      expect(packed).toBeDefined()

      memoryboundariesclear()
      const again = memoryimportbook(unpackformat(packed!))
      expect(ispresent(again)).toBe(true)
      expect(again!.pages.length).toBe(1)

      const importedpage = memoryreadcodepage(again, cp.id)
      const runtime = memoryreadcodepageruntime(importedpage)
      expect(runtime?.board?.exitnorth).toBe('roomn')
    })

    it('round-trips trimmed wire book for import', () => {
      const cp = memorycreatecodepage('@object widget\n', {})
      const book = memorycreatebook([cp])
      const trimmed = wiretrimmedbookforimport(book)
      const packed = packformat(trimmed)
      expect(packed).toBeDefined()

      memoryboundariesclear()
      const again = memoryimportbook(unpackformat(packed!))
      expect(ispresent(again)).toBe(true)
      expect(memoryreadcodepage(again, cp.id)?.id).toBe(cp.id)
    })
  })
})
