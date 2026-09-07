import { compilescript } from 'zss/feature/lang/langcompileclient'
import { cleartickreadcontextall } from 'zss/firmware/runtime'
import {
  DRIVER_TYPE,
  firmwaregetcommand,
  firmwarelistcommands,
} from 'zss/firmware/runner'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memorysendtoelement } from 'zss/memory/gamesend'
import { memorytickobject, memoryhaltallchips } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
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

function tickpair(
  book: { timestamp: number },
  board: Parameters<typeof memorytickobject>[1],
  head: Parameters<typeof memorytickobject>[2],
  seg: Parameters<typeof memorytickobject>[2],
  n: number,
) {
  for (let i = 0; i < n; ++i) {
    book.timestamp += 1
    READ_CONTEXT.timestamp = book.timestamp
    memorytickobject(book as never, board, head, HEAD_CODE)
    memorytickobject(book as never, board, seg, SEGMENT_CODE)
  }
}

describe('centipede script layout', () => {
  it('keeps handlers above :think with boot #end', () => {
    const headbuild = compilescript('head', HEAD_CODE)
    const headtext = Function.prototype.toString.call(headbuild.code!)
    expect(headtext).toMatch(
      /command\('think'\).*command\('end'\).*'acceptlink' label/s,
    )
    expect(HEAD_CODE.indexOf(':fullreverse')).toBeGreaterThan(0)
    expect(HEAD_CODE.lastIndexOf(':think')).toBeGreaterThan(
      HEAD_CODE.indexOf(':fullreverse'),
    )
    expect(HEAD_CODE).toMatch(/#send "\$p3" :dofollow/)
    expect(HEAD_CODE).toMatch(/:preparefollow/)
    expect(HEAD_CODE).toMatch(/:thud[\s\S]*#idle\n#think/)
    expect(HEAD_CODE).toMatch(/#idle\n#think\s*$/)
    expect(HEAD_CODE).not.toMatch(/:thud[\s\S]*#idle\n#end/)
    expect(HEAD_CODE).not.toMatch(/#pset/)
    expect(SEGMENT_CODE).toMatch(/#idle\n#think/)
    expect(SEGMENT_CODE).toMatch(/:preparefollow/)
    expect(SEGMENT_CODE).toMatch(/:dofollow/)
    expect(SEGMENT_CODE).not.toMatch(/:think[\s\S]*#send n trylink/)
  })
})

describe('centipede behaviors', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryboundariesclear()
    memoryhaltallchips()
    memoryresetbooks([])
  })

  function makebook() {
    expect(firmwarelistcommands(DRIVER_TYPE.RUNTIME)).toContain('shortsend')
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'shortsend')).toBeTruthy()
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'pget')).toBeTruthy()
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

  it('links a head to an adjacent north segment within a few ticks', () => {
    const { book, board } = makebook()
    const head = memorycreateboardobjectfromkind(
      board,
      { x: 10, y: 10 },
      'head',
      'oid_head',
    )!
    const seg = memorycreateboardobjectfromkind(
      board,
      { x: 10, y: 9 },
      'segment',
      'oid_seg',
    )!
    head.cycle = 1
    seg.cycle = 1
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    memorytickobject(book, board, seg, SEGMENT_CODE)
    memorytickobject(book, board, head, HEAD_CODE)
    tickpair(book, board, head, seg, 12)
    expect(head.p3).toBe('oid_seg')
    expect(seg.p4).toBe('oid_head')
    expect(seg.kind).toBe('segment')
  })

  it('passive segment with leader does not seek or claim', () => {
    const { book, board } = makebook()
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

  it('orphan segment becomes head after p5 grace', () => {
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
    for (let i = 0; i < 8; ++i) {
      book.timestamp += 1
      READ_CONTEXT.timestamp = book.timestamp
      memorytickobject(book, board, seg, SEGMENT_CODE)
      if (seg.p5 === 1) {
        sawgrace = true
      }
      const still = board.objects?.oid_orphan_seg
      if (!still || still.kind === 'head' || still.removed) {
        promoted = true
        break
      }
    }
    expect(sawgrace || promoted).toBe(true)
    expect(promoted).toBe(true)
  })

  it('linked head keeps moving after thud (no #end)', () => {
    const { book, board } = makebook()
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
    head.cycle = 1
    seg1.cycle = 1
    head.p1 = 0
    head.p2 = 0
    head.p3 = 'oid_seg1'
    seg1.p4 = 'oid_head'
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
