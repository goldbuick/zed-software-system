import { compilescript } from 'zss/feature/lang/langcompileclient'
import { cleartickreadcontextall } from 'zss/firmware/runtime'
import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memorysendtoelement } from 'zss/memory/gamesend'
import {
  memoryhaltallchips,
  memorytickobject,
  memorytickonce,
} from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { createsid } from 'zss/mapping/guid'
import { READ_CONTEXT } from 'zss/words/reader'
import fs from 'node:fs'
import path from 'node:path'

const RUFFIAN_CODE = fs
  .readFileSync(
    path.join(__dirname, '../../../fixtures/lang/coolregionsbow/ruffian.zss'),
    'utf8',
  )
  .replace(/\r\n/g, '\n')
  .replace(/\n$/, '')

const PLAYER_CODE = `@player
@ispushable
@cycle 1
@char 2
:shot
#set washurt 1
#end
`

describe('ruffian dest script', () => {
  it('dest-checks player before walk and keeps thud/touch die', () => {
    const build = compilescript('ruffian', RUFFIAN_CODE)
    expect(build.errors ?? []).toEqual([])
    expect(RUFFIAN_CODE).toMatch(/#walk seek p3 p4/)
    expect(RUFFIAN_CODE).toMatch(/#walk rnd p3 p4/)
    expect(RUFFIAN_CODE).toMatch(/#send by p3 p4 shot/)
    expect(RUFFIAN_CODE).toMatch(/#send by stepx stepy shot/)
    expect(RUFFIAN_CODE).toMatch(
      /:thud\n#if any at senderx sendery player do\n #send at senderx sendery shot\n #die/,
    )
    expect(RUFFIAN_CODE).toMatch(/:touch\n#send at senderx sendery shot\n#die/)
    expect(RUFFIAN_CODE).not.toMatch(/\?seek/)
  })
})

describe('ruffian BoardAttack on dest and contact', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryhaltallchips()
    memoryresetbooks([])
  })

  function setupboard(ruffianx: number, playerx: number) {
    const ruffianpage = memorycreatecodepage(RUFFIAN_CODE, {})
    const playerpage = memorycreatecodepage(PLAYER_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([ruffianpage, playerpage, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    memoryensureboardready(board)

    const pid = `pid_${createsid()}`
    const player = memorycreateboardobjectfromkind(
      board,
      { x: playerx, y: 5 },
      'player',
      pid,
    )!
    const ruffian = memorycreateboardobjectfromkind(
      board,
      { x: ruffianx, y: 5 },
      'ruffian',
      'oid_ruffian',
    )!
    ruffian.player = pid
    ruffian.cycle = 1
    player.cycle = 1
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    return { book, board, ruffian, player, pid }
  }

  it('sends shot at dest player while rushing and dies without shoving', () => {
    // one empty tile: everytick steps closer, then dest-check fires before the next shove
    const { book, board, ruffian, player } = setupboard(4, 6)
    ruffian.stepx = 1
    ruffian.stepy = 0
    // skip rest/re-aim/stop-roll random branches
    ruffian.p1 = 0
    ruffian.p2 = 9

    memorytickobject(book, board, ruffian, RUFFIAN_CODE)

    expect(ruffian.removed).toBeTruthy()
    expect(ruffian.x).toBe(5)
    expect(player.x).toBe(6)
    expect(player.y).toBe(5)
    expect(player.removed).toBeFalsy()
  })

  it('sends shot at dest player when starting a rush and does not set step', () => {
    const { book, board, ruffian, player } = setupboard(5, 6)
    ruffian.stepx = 0
    ruffian.stepy = 0
    ruffian.p1 = 8
    ruffian.p2 = -8

    memorytickobject(book, board, ruffian, RUFFIAN_CODE)

    expect(ruffian.removed).toBeTruthy()
    expect(player.x).toBe(6)
    expect(player.y).toBe(5)
    expect(player.removed).toBeFalsy()
  })

  it('dies on thud into player', () => {
    const { book, board, ruffian, player, pid } = setupboard(5, 10)
    ruffian.stepx = 0
    ruffian.stepy = 0
    ruffian.p1 = 0
    ruffian.p2 = 9

    memorytickobject(book, board, ruffian, RUFFIAN_CODE)
    expect(ruffian.removed).toBeFalsy()

    READ_CONTEXT.book = book
    READ_CONTEXT.board = board
    READ_CONTEXT.elementfocus = pid
    memorysendtoelement(player, ruffian, 'thud')
    memorytickobject(book, board, ruffian, RUFFIAN_CODE)

    expect(ruffian.removed).toBeTruthy()
    expect(player.x).toBe(10)
    expect(player.y).toBe(5)
  })

  it('dies on touch', () => {
    const { book, board, ruffian, player } = setupboard(5, 10)

    memorytickonce(book, board, ruffian, RUFFIAN_CODE, ruffian.id!, 'touch')

    expect(ruffian.removed).toBeTruthy()
    expect(player.x).toBe(10)
    expect(player.y).toBe(5)
  })
})
