import { packformat, unpackformat } from 'zss/feature/format'
import { MAYBE, ispresent } from 'zss/mapping/types'

import {
  memoryclearbookcodepage,
  memorycreatebook,
  memoryexportbook,
  memoryimportbook,
  memoryreadbookflags,
  memoryreadcodepage,
  memorywritebookflag,
} from '../bookoperations'
import {
  memoryboundariesclear,
  memoryboundaryalloc,
  memoryboundaryget,
} from '../boundaries'
import { memorycreatecodepage } from '../codepageoperations'
import { memoryresetbooks } from '../session'
import { MEMORY_LABEL } from '../types'

describe('book opaque boundaries', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('stores code pages in boundaries and resolves by id', () => {
    const cp = memorycreatecodepage('@board testboard\n', {})
    const book = memorycreatebook([cp])
    expect(book.pages.length).toBe(1)
    expect(book.pages[0]).toBe(cp.id)
    expect(book.flags).toEqual({})
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
    expect(
      memoryboundaryget(book.flags[MEMORY_LABEL.GADGETSTORE]),
    ).toBeDefined()
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

    expect(memoryboundaryget(book.pages[0])).toBeDefined()
    expect(memoryboundaryget(boardruntime)).toBeDefined()
    expect(memoryboundaryget(terrainruntime)).toBeDefined()
    expect(memoryboundaryget(objectruntime)).toBeDefined()
    expect(memoryboundaryget(pageobjectruntime)).toBeDefined()
    expect(memoryboundaryget(pageterrainruntime)).toBeDefined()

    const { memoryfreebook } =
      jest.requireActual<typeof import('../session')>('../session')
    memoryfreebook(book)

    expect(memoryboundaryget(book.pages[0])).toBeUndefined()
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

    expect(memoryboundaryget(book.pages[0])).toBeDefined()
    expect(memoryboundaryget(boardruntime)).toBeDefined()
    expect(memoryboundaryget(objectruntime)).toBeDefined()

    const removed = memoryclearbookcodepage(book, cp.id)
    expect(removed?.id).toBe(cp.id)
    expect(memoryboundaryget(book.pages[0])).toBeUndefined()
    expect(memoryboundaryget(boardruntime)).toBeUndefined()
    expect(memoryboundaryget(objectruntime)).toBeUndefined()
  })
})
