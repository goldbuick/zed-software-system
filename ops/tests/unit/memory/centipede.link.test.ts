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

describe('centipede head/segment link', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('links a head to an adjacent north segment within a few ticks', () => {
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

    for (let i = 0; i < 8; ++i) {
      book.timestamp += 1
      READ_CONTEXT.timestamp = book.timestamp
      memorytickobject(book, board, head, HEAD_CODE)
      memorytickobject(book, board, seg, SEGMENT_CODE)
      if (
        (head as { follower?: string }).follower === 'oid_seg' &&
        (seg as { leader?: string }).leader === 'oid_head'
      ) {
        break
      }
    }

    expect((head as { follower?: string }).follower).toBe('oid_seg')
    expect((seg as { leader?: string }).leader).toBe('oid_head')
    expect(seg.kind).toBe('segment')
  })
})
