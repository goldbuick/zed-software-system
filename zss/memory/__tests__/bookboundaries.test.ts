import { packformat, unpackformat } from 'zss/feature/format'
import { MAYBE, ispresent } from 'zss/mapping/types'

import {
  memorycreatebook,
  memoryexportbook,
  memoryimportbook,
  memorynormalizebookforstorage,
  memoryreadbookflags,
  memoryreadcodepage,
  memorywritebookflag,
} from '../bookoperations'
import { memoryboundariesclear, memoryboundaryget } from '../boundaries'
import { memorycreatecodepage } from '../codepageoperations'
import { memoryreadbookbyaddress, memoryresetbooks } from '../session'
import { MEMORY_LABEL } from '../types'

describe('book opaque boundaries', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('stores code pages in boundaries and resolves by id', () => {
    const cp = memorycreatecodepage('@board testboard\n', {})
    const book = memorycreatebook([cp])
    expect(book.pages.length).toBe(1)
    expect(typeof book.flags).toBe('string')
    const stored = memoryboundaryget(book.pages[0])
    expect(stored).toBeDefined()
    expect((stored as { id: string }).id).toBe(cp.id)
    expect(memoryreadcodepage(book, cp.id)?.id).toBe(cp.id)
  })

  it('round-trips export and import with embedded pages in wire object', () => {
    const cp = memorycreatecodepage('@object widget\n', {})
    const book = memorycreatebook([cp])
    const exported = memoryexportbook(book)
    expect(ispresent(exported)).toBe(true)
    const packed = packformat(exported!)
    expect(packed).toBeDefined()
    const unpacked = unpackformat(packed!) as MAYBE<typeof exported>
    expect(ispresent(unpacked)).toBe(true)
    memoryboundariesclear()
    const again = memoryimportbook(unpacked)
    expect(ispresent(again)).toBe(true)
    expect(again!.pages.length).toBe(1)
    expect(memoryreadcodepage(again, cp.id)?.id).toBe(cp.id)
  })

  it('mutates flags through boundary-backed record', () => {
    const book = memorycreatebook([])
    memorywritebookflag(book, MEMORY_LABEL.GADGETSTORE, 'x', 42 as any)
    const root = memoryreadbookflags(book, MEMORY_LABEL.GADGETSTORE)
    expect(root.x).toBe(42)
    expect(memoryboundaryget(book.flags)).toBeDefined()
  })

  it('memorynormalizebookforstorage migrates legacy inline pages and flags', () => {
    memoryboundariesclear()
    const legacy = {
      id: 'book_legacy',
      name: 'main',
      timestamp: 0,
      activelist: [],
      pages: [
        {
          id: 'pg1',
          code: '@board b1\n',
          stats: { name: 'b1' },
        },
      ],
      flags: { gadgetstore: { a: 1 as any } },
    }
    const book = memorynormalizebookforstorage(legacy)
    expect(ispresent(book)).toBe(true)
    expect(book!.pages.length).toBe(1)
    expect(memoryreadcodepage(book, 'pg1')?.id).toBe('pg1')
    const gadget = memoryreadbookflags(book, 'gadgetstore')
    expect(gadget.a).toBe(1)
  })

  it('memoryresetbooks hydrates legacy and stores normalized book', () => {
    memoryresetbooks([
      {
        id: 'book_hydrate',
        name: 'main',
        timestamp: 0,
        activelist: [],
        pages: [],
        flags: {},
      } as unknown,
    ])
    const stored = memoryreadbookbyaddress('book_hydrate')
    expect(stored?.pages).toEqual([])
    expect(typeof stored?.flags).toBe('string')
    expect(memoryboundaryget(stored!.flags)).toEqual({})
  })
})
