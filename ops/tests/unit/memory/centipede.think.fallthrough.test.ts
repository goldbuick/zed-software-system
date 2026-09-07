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
import { memorytickobject } from 'zss/memory/runtime'
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

describe('centipede H1 fix: handlers above :think', () => {
  it('separates boot #think from :acceptlink with #end', () => {
    const build = compilescript('head', HEAD_CODE)
    const text = Function.prototype.toString.call(build.code!)
    expect(text).toMatch(
      /command\('think'\).*command\('end'\).*'acceptlink' label/s,
    )
  })

  it('separates boot #think from :trylink with #end', () => {
    const build = compilescript('segment', SEGMENT_CODE)
    const text = Function.prototype.toString.call(build.code!)
    expect(text).toMatch(
      /command\('think'\).*command\('end'\).*'trylink' label/s,
    )
  })

  it('keeps main :think after message handlers in source', () => {
    const accept = HEAD_CODE.indexOf(':acceptlink')
    const think = HEAD_CODE.lastIndexOf(':think')
    expect(accept).toBeGreaterThan(0)
    expect(think).toBeGreaterThan(accept)

    const trylink = SEGMENT_CODE.indexOf(':trylink')
    const segthink = SEGMENT_CODE.lastIndexOf(':think')
    expect(trylink).toBeGreaterThan(0)
    expect(segthink).toBeGreaterThan(trylink)
  })
})

describe('centipede head/segment link after H1 fix', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('links a head to an adjacent north segment within a few ticks', () => {
    expect(firmwarelistcommands(DRIVER_TYPE.RUNTIME)).toContain('shortsend')
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'shortsend')).toBeTruthy()

    const headpage = memorycreatecodepage(HEAD_CODE, {})
    const segpage = memorycreatecodepage(SEGMENT_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([headpage, segpage, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)

    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    memoryensureboardready(board)

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

    // Boot both chips so directional #send can deliver locally
    memorytickobject(book, board, seg, SEGMENT_CODE)
    memorytickobject(book, board, head, HEAD_CODE)

    for (let i = 0; i < 12; ++i) {
      book.timestamp += 1
      READ_CONTEXT.timestamp = book.timestamp
      memorytickobject(book, board, head, HEAD_CODE)
      memorytickobject(book, board, seg, SEGMENT_CODE)
      if (head.p3 === 'oid_seg' && seg.p4 === 'oid_head') {
        break
      }
    }

    expect(head.p3).toBe('oid_seg')
    expect(seg.p4).toBe('oid_head')
    expect(seg.kind).toBe('segment')
  })
})
