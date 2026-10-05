import { compilescript } from 'zss/feature/lang/langcompileclient'
import { READ_LAYER, memoryreadelement } from 'zss/memory/boardaccess'
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
import { memoryreadflags } from 'zss/memory/bookoperations'
import { memoryhaltallchips, memorytickobject } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { createsid } from 'zss/mapping/guid'
import { cleartickreadcontextall } from 'zss/firmware/runtime'
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

const PLAYER_CODE = `@player
@cycle 1
@char 2
:shot
#set washurt 1
#end
`

const WALL_CODE = `@terrain wall
@issolid
@char 178
`

describe('centipede rozzt behavior', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryhaltallchips()
    memoryresetbooks([])
  })

  function setup() {
    expect(compilescript('head', HEAD_CODE).errors ?? []).toEqual([])
    expect(compilescript('segment', SEGMENT_CODE).errors ?? []).toEqual([])
    const headpage = memorycreatecodepage(HEAD_CODE, {})
    const segpage = memorycreatecodepage(SEGMENT_CODE, {})
    const playerpage = memorycreatecodepage(PLAYER_CODE, {})
    const wallpage = memorycreatecodepage(WALL_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([
      headpage,
      segpage,
      playerpage,
      wallpage,
      boardpage,
    ])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    memoryensureboardready(board)
    const pid = `pid_${createsid()}`
    const player = memorycreateboardobjectfromkind(
      board,
      { x: 20, y: 12 },
      'player',
      pid,
    )!
    player.cycle = 1
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    board.currenttick = 0
    return { book, board, player, pid }
  }

  function place(
    board: BOARD,
    kind: string,
    x: number,
    y: number,
    id: string,
    pid: string,
  ) {
    const el = memorycreateboardobjectfromkind(board, { x, y }, kind, id)!
    el.player = pid
    el.cycle = 1
    return el
  }

  function wall(board: BOARD, x: number, y: number) {
    memorywriteterrain(board, { x, y, kind: 'wall' })
  }

  function tick(book: BOOK, board: BOARD, el: BOARD_ELEMENT, code: string) {
    memorytickobject(book, board, el, code)
  }

  it('drags a 3-node chain one cell and copies intel', () => {
    const { book, board, pid } = setup()
    const head = place(board, 'head', 5, 5, 'oid_head', pid)
    const a = place(board, 'segment', 4, 5, 'oid_a', pid)
    const b = place(board, 'segment', 3, 5, 'oid_b', pid)
    head.p1 = 4
    head.p2 = 0
    head.p3 = a.id
    head.p5 = 1
    head.p6 = 0
    a.p3 = b.id
    a.p4 = head.id
    b.p4 = a.id

    tick(book, board, head, HEAD_CODE)

    expect(head.x).toBe(6)
    expect(head.y).toBe(5)
    expect(head.p3).toBe(a.id)
    expect(head.p4).toBe(0)
    expect(a.x).toBe(5)
    expect(a.y).toBe(5)
    expect(a.p4).toBe(head.id)
    expect(a.p3).toBe(b.id)
    expect(a.p1).toBe(4)
    expect(a.p2).toBe(0)
    expect(a.p5).toBe(1)
    expect(a.p6).toBe(0)
    expect(a.p7).toBe(0)
    expect(b.x).toBe(4)
    expect(b.y).toBe(5)
    expect(b.p4).toBe(a.id)
    expect(b.p1).toBe(4)
    expect(b.p2).toBe(0)
    expect(b.p7).toBe(0)
  })

  it('adopts an unlinked segment behind the head', () => {
    const { book, board, pid } = setup()
    const head = place(board, 'head', 5, 5, 'oid_head', pid)
    const seg = place(board, 'segment', 4, 5, 'oid_seg', pid)
    head.p1 = 4
    head.p2 = 0
    head.p5 = 1
    head.p6 = 0

    tick(book, board, head, HEAD_CODE)

    expect(head.x).toBe(6)
    expect(head.p3).toBe(seg.id)
    expect(seg.x).toBe(5)
    expect(seg.y).toBe(5)
    expect(seg.p4).toBe(head.id)
    expect(seg.p7).toBe(0)
    expect(seg.p1).toBe(4)
  })

  it('adopts a segment whose leader id is already dead', () => {
    const { book, board, pid } = setup()
    const head = place(board, 'head', 5, 5, 'oid_head', pid)
    const seg = place(board, 'segment', 4, 5, 'oid_seg', pid)
    head.p1 = 3
    head.p2 = 0
    head.p5 = 1
    head.p6 = 0
    seg.p4 = 'dead-id'
    seg.p7 = 4

    tick(book, board, head, HEAD_CODE)

    expect(head.p3).toBe(seg.id)
    expect(seg.x).toBe(5)
    expect(seg.p4).toBe(head.id)
    expect(seg.p7).toBe(0)
    expect(seg.kind).toBe('segment')
  })

  it('chases along a shared column when intel is max', () => {
    const { book, board, player, pid } = setup()
    player.x = 5
    player.y = 8
    const head = place(board, 'head', 5, 5, 'oid_head', pid)
    head.p1 = 10
    head.p2 = 0
    head.p5 = 0
    head.p6 = 0

    tick(book, board, head, HEAD_CODE)

    expect(head.x).toBe(5)
    expect(head.y).toBe(6)
    expect(head.removed).toBeFalsy()
    expect(memoryreadflags(book, pid).washurt).toBeUndefined()
  })

  it('shot-attacks a player on the dest cell and promotes the follower', () => {
    const { book, board, player, pid } = setup()
    player.x = 6
    player.y = 5
    const head = place(board, 'head', 5, 5, 'oid_head', pid)
    const seg = place(board, 'segment', 4, 5, 'oid_seg', pid)
    head.p1 = 10
    head.p2 = 0
    head.p3 = seg.id
    head.p5 = 0
    head.p6 = 0
    seg.p4 = head.id

    tick(book, board, head, HEAD_CODE)
    tick(book, board, player, PLAYER_CODE)

    expect(head.removed).toBeTruthy()
    expect(player.x).toBe(6)
    expect(player.y).toBe(5)
    expect(memoryreadflags(book, pid).washurt).toBe(1)
    expect(seg.p5).toBe(1)
    expect(seg.p6).toBe(0)
    expect(seg.kind).toBe('segment')

    tick(book, board, seg, SEGMENT_CODE)

    expect(seg.kind).toBe('head')
    expect(seg.x).toBe(4)
    expect(seg.y).toBe(5)
  })

  it('turns to the open perpendicular when ahead is blocked', () => {
    const { book, board, pid } = setup()
    const head = place(board, 'head', 5, 5, 'oid_head', pid)
    head.p1 = 0
    head.p2 = 0
    head.p5 = 1
    head.p6 = 0
    wall(board, 6, 5)
    wall(board, 5, 4)

    tick(book, board, head, HEAD_CODE)

    expect(head.x).toBe(5)
    expect(head.y).toBe(6)
  })

  it('steps backward when ahead and both sides are blocked', () => {
    const { book, board, pid } = setup()
    const head = place(board, 'head', 5, 5, 'oid_head', pid)
    head.p1 = 0
    head.p2 = 0
    head.p5 = 1
    head.p6 = 0
    wall(board, 6, 5)
    wall(board, 5, 4)
    wall(board, 5, 6)

    tick(book, board, head, HEAD_CODE)

    expect(head.x).toBe(4)
    expect(head.y).toBe(5)
    expect(head.kind).toBe('head')
  })

  it('reverses the chain when boxed in', () => {
    const { book, board, pid } = setup()
    const head = place(board, 'head', 5, 5, 'oid_head', pid)
    const seg = place(board, 'segment', 4, 5, 'oid_seg', pid)
    head.p1 = 0
    head.p2 = 0
    head.p3 = seg.id
    head.p5 = 1
    head.p6 = 0
    seg.p4 = head.id
    wall(board, 6, 5)
    wall(board, 5, 4)
    wall(board, 5, 6)

    tick(book, board, head, HEAD_CODE)

    expect(head.kind).toBe('segment')
    expect(head.x).toBe(5)
    expect(head.y).toBe(5)
    expect(head.p4).toBe(seg.id)
    expect(head.p3).toBe(0)
    expect(head.p5).toBe(0)
    expect(head.p6).toBe(0)
    expect(seg.p3).toBe(head.id)
    expect(seg.kind).toBe('segment')

    tick(book, board, seg, SEGMENT_CODE)

    expect(seg.kind).toBe('head')
    expect(seg.x).toBe(4)
    expect(seg.y).toBe(5)
  })

  it('promotes an orphan segment after 2 segment ticks', () => {
    const { book, board, pid } = setup()
    const seg = place(board, 'segment', 4, 5, 'oid_seg', pid)
    seg.p4 = 'dead-id'
    seg.p7 = 0

    tick(book, board, seg, SEGMENT_CODE)

    expect(seg.kind).toBe('segment')
    expect(seg.p4).toBe(0)
    expect(seg.p7).toBe(1)

    tick(book, board, seg, SEGMENT_CODE)

    expect(seg.kind).toBe('head')
  })

  it('keeps a segment whose leader is still adjacent', () => {
    const { book, board, pid } = setup()
    const head = place(board, 'head', 5, 5, 'oid_head', pid)
    const seg = place(board, 'segment', 4, 5, 'oid_seg', pid)
    seg.p4 = head.id
    seg.p7 = 3

    tick(book, board, seg, SEGMENT_CODE)

    expect(seg.kind).toBe('segment')
    expect(seg.p4).toBe(head.id)
    expect(seg.p7).toBe(0)
    expect(
      memoryreadelement(board, { x: 4, y: 5 }, READ_LAYER.OBJECT)?.id,
    ).toBe(seg.id)
  })
})
