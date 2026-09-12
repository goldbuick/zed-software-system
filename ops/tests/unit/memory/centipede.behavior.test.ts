import {
  DRIVER_TYPE,
  firmwaregetcommand,
  firmwarelistcommands,
} from 'zss/firmware/runner'
import { compilescript } from 'zss/feature/lang/langcompileclient'
import { cleartickreadcontextall } from 'zss/firmware/runtime'
import {
  memorycreateboardobjectfromkind,
  memorywriteterrain,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memorysendtoelement } from 'zss/memory/gamesend'
import { memoryhaltallchips, memorytickobject } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { createsid } from 'zss/mapping/guid'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION } from 'zss/words/types'
import fs from 'node:fs'
import path from 'node:path'

const HEAD_CODE = fs
  .readFileSync(
    path.join(__dirname, '../../../fixtures/lang/coolregionsbow/head.zss'),
    'utf8',
  )
  .replace(/\r\n/g, '\n')
  .replace(/\n$/, '')

const SEGMENT_CODE = fs
  .readFileSync(
    path.join(__dirname, '../../../fixtures/lang/coolregionsbow/segment.zss'),
    'utf8',
  )
  .replace(/\r\n/g, '\n')
  .replace(/\n$/, '')

describe('centipede script layout', () => {
  it('keeps :think first with head-driven pset drag', () => {
    const headbuild = compilescript('head', HEAD_CODE)
    expect(headbuild.errors ?? []).toEqual([])
    const segbuild = compilescript('segment', SEGMENT_CODE)
    expect(segbuild.errors ?? []).toEqual([])

    expect(HEAD_CODE.indexOf(':think')).toBeLessThan(
      HEAD_CODE.indexOf(':thud'),
    )
    expect(HEAD_CODE).toMatch(/#pset idle/)
    expect(HEAD_CODE).toMatch(/#repeat 32 do/)
    expect(HEAD_CODE).not.toMatch(/:preparefollow/)
    expect(HEAD_CODE).not.toMatch(/:dofollow/)
    expect(HEAD_CODE).toMatch(/#idle\n#think/)

    expect(SEGMENT_CODE.indexOf(':think')).toBeLessThan(
      SEGMENT_CODE.indexOf(':thud'),
    )
    expect(SEGMENT_CODE).not.toMatch(/:preparefollow/)
    expect(SEGMENT_CODE).not.toMatch(/:dofollow/)
    expect(SEGMENT_CODE).not.toMatch(/:trylink/)
    expect(SEGMENT_CODE).toMatch(/:think[\s\S]*#if pget n id is p4/)
  })
})

describe('centipede behaviors', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryhaltallchips()
    memoryresetbooks([])
  })

  function makebook() {
    expect(firmwarelistcommands(DRIVER_TYPE.RUNTIME)).toContain('shortsend')
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'shortsend')).toBeTruthy()
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'stat')).toBeTruthy()
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'pget')).toBeFalsy()
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'pset')).toBeTruthy()

    const headpage = memorycreatecodepage(HEAD_CODE, {})
    const segpage = memorycreatecodepage(SEGMENT_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([headpage, segpage, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    memoryensureboardready(board)
    return { book, board }
  }

  function makeplayer(
    board: NonNullable<
      ReturnType<typeof memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>>
    >,
    x: number,
    y: number,
  ) {
    const pid = `pid_${createsid()}`
    memorycreateboardobjectfromkind(board, { x, y }, 'player', pid)
    return { pid }
  }

  it('claims adjacent segment behind vacated cell on head move', () => {
    const { book, board } = makebook()
    const { pid } = makeplayer(board, 10, 0)
    const head = memorycreateboardobjectfromkind(
      board,
      { x: 10, y: 10 },
      'head',
      'oid_head',
    )!
    const seg = memorycreateboardobjectfromkind(
      board,
      { x: 10, y: 11 },
      'segment',
      'oid_seg',
    )!
    head.player = pid
    head.cycle = 1
    seg.cycle = 1
    head.p1 = 10
    head.p2 = 0
    head.stepx = 0
    head.stepy = 0
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    memorytickobject(book, board, head, HEAD_CODE)
    expect(head.x).toBe(10)
    expect(head.y).toBe(9)
    expect(head.p3).toBe('oid_seg')
    expect(seg.p4).toBe('oid_head')
    expect(seg.x).toBe(10)
    expect(seg.y).toBe(10)
    expect(seg.kind).toBe('segment')
  })

  it('same-tick drag: head move pulls linked segment into vacated cell', () => {
    const { book, board } = makebook()
    const { pid } = makeplayer(board, 10, 0)
    const head = memorycreateboardobjectfromkind(
      board,
      { x: 10, y: 10 },
      'head',
      'oid_head',
    )!
    const seg = memorycreateboardobjectfromkind(
      board,
      { x: 10, y: 11 },
      'segment',
      'oid_seg',
    )!
    head.player = pid
    head.cycle = 1
    seg.cycle = 1
    head.p1 = 10
    head.p2 = 0
    head.p3 = 'oid_seg'
    seg.p4 = 'oid_head'
    head.stepx = 0
    head.stepy = 0
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    memorytickobject(book, board, head, HEAD_CODE)
    expect(head.x).toBe(10)
    expect(head.y).toBe(9)
    expect(seg.x).toBe(10)
    expect(seg.y).toBe(10)
    expect(seg.p4).toBe('oid_head')
  })

  it('boxed-in head stays put instead of corrupting the chain', () => {
    const { book, board } = makebook()
    const { pid } = makeplayer(board, 30, 30)
    for (const [x, y] of [
      [9, 10],
      [11, 10],
      [10, 9],
      [10, 11],
    ] as const) {
      memorywriteterrain(board, {
        x,
        y,
        kind: 'solid',
        collision: COLLISION.ISSOLID,
      })
    }
    const head = memorycreateboardobjectfromkind(
      board,
      { x: 10, y: 10 },
      'head',
      'oid_head',
    )!
    head.player = pid
    head.cycle = 1
    head.p1 = 0
    head.p2 = 0
    head.stepx = 0
    head.stepy = 0
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    for (let i = 0; i < 6; ++i) {
      book.timestamp += 1
      READ_CONTEXT.timestamp = book.timestamp
      memorytickobject(book, board, head, HEAD_CODE)
    }
    expect(head.x).toBe(10)
    expect(head.y).toBe(10)
    expect(head.kind).toBe('head')
    expect(head.removed).toBeFalsy()
  })

  it('promotes a segment whose leader was removed', () => {
    const { book, board } = makebook()
    const head = memorycreateboardobjectfromkind(
      board,
      { x: 10, y: 10 },
      'head',
      'oid_dead_head',
    )!
    const seg = memorycreateboardobjectfromkind(
      board,
      { x: 10, y: 11 },
      'segment',
      'oid_seg',
    )!
    seg.cycle = 1
    seg.p4 = 'oid_dead_head'
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    memorytickobject(book, board, seg, SEGMENT_CODE)
    book.timestamp += 1
    READ_CONTEXT.timestamp = book.timestamp
    memorytickobject(book, board, seg, SEGMENT_CODE)
    expect(seg.kind).toBe('segment')

    head.removed = 1
    delete board.objects?.oid_dead_head
    let promoted = false
    for (let i = 0; i < 20; ++i) {
      book.timestamp += 1
      READ_CONTEXT.timestamp = book.timestamp
      memorytickobject(book, board, seg, SEGMENT_CODE)
      if (board.objects?.oid_seg?.kind === 'head') {
        promoted = true
        break
      }
    }
    expect(promoted).toBe(true)
  })

  it('passive segment with leader does not seek or claim', () => {
    const { book, board } = makebook()
    const { pid } = makeplayer(board, 1, 1)
    const head = memorycreateboardobjectfromkind(
      board,
      { x: 5, y: 5 },
      'head',
      'oid_head',
    )!
    const seg = memorycreateboardobjectfromkind(
      board,
      { x: 20, y: 20 },
      'segment',
      'oid_seg',
    )!
    const orphan = memorycreateboardobjectfromkind(
      board,
      { x: 20, y: 19 },
      'segment',
      'oid_orphan',
    )!
    head.player = pid
    head.cycle = 1
    seg.cycle = 1
    orphan.cycle = 1
    seg.p4 = 'oid_head'
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    memorytickobject(book, board, seg, SEGMENT_CODE)
    for (let i = 0; i < 6; ++i) {
      book.timestamp += 1
      READ_CONTEXT.timestamp = book.timestamp
      memorytickobject(book, board, seg, SEGMENT_CODE)
    }
    expect(seg.x).toBe(20)
    expect(seg.y).toBe(20)
    expect(seg.p3).toBeFalsy()
    expect(orphan.p4).toBeFalsy()
  })

  it('orphan segment morphs to head after p5 grace (same id)', () => {
    const { book, board } = makebook()
    const seg = memorycreateboardobjectfromkind(
      board,
      { x: 8, y: 8 },
      'segment',
      'oid_orphan_seg',
    )!
    seg.cycle = 1
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    memorytickobject(book, board, seg, SEGMENT_CODE)
    let sawgrace = false
    let promoted = false
    for (let i = 0; i < 20; ++i) {
      book.timestamp += 1
      READ_CONTEXT.timestamp = book.timestamp
      memorytickobject(book, board, seg, SEGMENT_CODE)
      if (seg.p5 === 1) {
        sawgrace = true
      }
      const still = board.objects?.oid_orphan_seg
      if (still && still.kind === 'head' && !still.removed) {
        promoted = true
        break
      }
    }
    expect(sawgrace || promoted).toBe(true)
    expect(promoted).toBe(true)
    const still = board.objects?.oid_orphan_seg
    expect(still).toBeDefined()
    expect(still!.id).toBe('oid_orphan_seg')
    expect(still!.kind).toBe('head')
    expect(still!.removed).toBeFalsy()
  })

  it('linked head keeps moving after thud (no #end)', () => {
    const { book, board } = makebook()
    const { pid } = makeplayer(board, 12, 0)
    const head = memorycreateboardobjectfromkind(
      board,
      { x: 12, y: 12 },
      'head',
      'oid_head',
    )!
    const seg1 = memorycreateboardobjectfromkind(
      board,
      { x: 12, y: 13 },
      'segment',
      'oid_seg1',
    )!
    head.player = pid
    head.cycle = 1
    seg1.cycle = 1
    head.p1 = 10
    head.p2 = 0
    head.p3 = 'oid_seg1'
    seg1.p4 = 'oid_head'
    head.stepx = 0
    head.stepy = 0
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    memorytickobject(book, board, seg1, SEGMENT_CODE)
    memorytickobject(book, board, head, HEAD_CODE)

    let headmoved = 0
    for (let i = 0; i < 20; ++i) {
      const hx = head.x ?? 0
      const hy = head.y ?? 0
      book.timestamp += 1
      READ_CONTEXT.timestamp = book.timestamp
      memorytickobject(book, board, head, HEAD_CODE)
      memorytickobject(book, board, seg1, SEGMENT_CODE)
      if ((head.x ?? 0) !== hx || (head.y ?? 0) !== hy) {
        headmoved += 1
      }
    }
    const beforethud = headmoved
    READ_CONTEXT.book = book
    READ_CONTEXT.board = board
    READ_CONTEXT.element = head
    READ_CONTEXT.elementid = head.id ?? ''
    memorysendtoelement(seg1, head, 'thud')
    // nudge player so head still has a seek target after thud
    const player = board.objects?.[pid]
    if (player) {
      player.y = Math.max(0, (head.y ?? 12) - 5)
    }
    for (let i = 0; i < 16; ++i) {
      const hx = head.x ?? 0
      const hy = head.y ?? 0
      book.timestamp += 1
      READ_CONTEXT.timestamp = book.timestamp
      memorytickobject(book, board, head, HEAD_CODE)
      memorytickobject(book, board, seg1, SEGMENT_CODE)
      if ((head.x ?? 0) !== hx || (head.y ?? 0) !== hy) {
        headmoved += 1
      }
    }
    expect(beforethud).toBeGreaterThan(2)
    expect(headmoved).toBeGreaterThan(beforethud)
  })
})
