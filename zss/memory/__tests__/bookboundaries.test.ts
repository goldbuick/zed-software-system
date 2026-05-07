import { packformat, unpackformat } from 'zss/feature/format'
import { creategadgetid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  memoryclearbookcodepage,
  memorycreatebook,
  memoryexportbook,
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
  memoryreadcodepageruntime,
} from 'zss/memory/codepageoperations'
import {
  memoryexportbooksasjson,
  memoryimportbooksfromjson,
} from 'zss/memory/utilities'

import { memoryresetbooks } from '../session'

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

    const json = memoryexportbooksasjson([book])
    memoryboundariesclear()
    memoryresetbooks([])

    const importedlist = memoryimportbooksfromjson(json)
    expect(importedlist.length).toBe(1)
    memoryresetbooks(importedlist)

    const cp2 = memoryreadcodepage(importedlist[0], cp.id)
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

    const { memoryfreebook } =
      jest.requireActual<typeof import('../session')>('../session')
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
