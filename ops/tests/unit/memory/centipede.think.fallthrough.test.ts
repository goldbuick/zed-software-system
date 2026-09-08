import {
  DRIVER_TYPE,
  firmwaregetcommand,
  firmwarelistcommands,
} from 'zss/firmware/runner'
import { compilescript } from 'zss/feature/lang/langcompileclient'
import { cleartickreadcontextall } from 'zss/firmware/runtime'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memorytickobject } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { createsid } from 'zss/mapping/guid'
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

describe('centipede handlers after :think', () => {
  it('places :think before :thud on head', () => {
    const build = compilescript('head', HEAD_CODE)
    expect(build.errors ?? []).toEqual([])
    expect(HEAD_CODE.indexOf(':think')).toBeLessThan(
      HEAD_CODE.indexOf(':thud'),
    )
  })

  it('places :think before :thud on segment', () => {
    const build = compilescript('segment', SEGMENT_CODE)
    expect(build.errors ?? []).toEqual([])
    expect(SEGMENT_CODE.indexOf(':think')).toBeLessThan(
      SEGMENT_CODE.indexOf(':thud'),
    )
  })
})

describe('centipede head claims adjacent segment', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('links a head to an adjacent segment behind vacated cell', () => {
    expect(firmwarelistcommands(DRIVER_TYPE.RUNTIME)).toContain('shortsend')
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'shortsend')).toBeTruthy()
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'stat')).toBeTruthy()

    const headpage = memorycreatecodepage(HEAD_CODE, {})
    const segpage = memorycreatecodepage(SEGMENT_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([headpage, segpage, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)

    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    memoryensureboardready(board)

    const pid = `pid_${createsid()}`
    memorycreateboardobjectfromkind(board, { x: 10, y: 0 }, 'player', pid)
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

    expect(head.p3).toBe('oid_seg')
    expect(seg.p4).toBe('oid_head')
    expect(seg.kind).toBe('segment')
  })
})
