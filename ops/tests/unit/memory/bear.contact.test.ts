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
import { memoryhaltallchips, memorytickobject } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { createsid } from 'zss/mapping/guid'
import { READ_CONTEXT } from 'zss/words/reader'
import fs from 'node:fs'
import path from 'node:path'

const BEAR_CODE = fs
  .readFileSync(
    path.join(__dirname, '../../../fixtures/lang/coolregionsbow/bear.zss'),
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

describe('bear RoZZT contact script', () => {
  it('uses p2/p3 deltas, no ispushable, no thud', () => {
    const build = compilescript('bear', BEAR_CODE)
    expect(build.errors ?? []).toEqual([])
    expect(BEAR_CODE).not.toMatch(/@ispushable/)
    expect(BEAR_CODE).not.toMatch(/:thud/)
    expect(BEAR_CODE).toMatch(/#set p2 0/)
    expect(BEAR_CODE).toMatch(/#set p3 0/)
    expect(BEAR_CODE).toMatch(/#send by p2 p3 shot/)
    expect(BEAR_CODE).toMatch(/\?by p2 p3/)
    expect(BEAR_CODE).toMatch(/:touch\n#send at senderx sendery shot/)
  })
})

describe('bear BoardAttack on adjacent pushable player', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryboundariesclear()
    memoryhaltallchips()
    memoryresetbooks([])
  })

  it('sends shot and dies instead of shoving the player', () => {
    expect(firmwarelistcommands(DRIVER_TYPE.RUNTIME)).toContain('shortsend')
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'shortsend')).toBeTruthy()
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'stat')).toBeTruthy()

    const bearpage = memorycreatecodepage(BEAR_CODE, {})
    const playerpage = memorycreatecodepage(PLAYER_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([bearpage, playerpage, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    memoryensureboardready(board)

    const pid = `pid_${createsid()}`
    const player = memorycreateboardobjectfromkind(
      board,
      { x: 6, y: 5 },
      'player',
      pid,
    )!
    const bear = memorycreateboardobjectfromkind(
      board,
      { x: 5, y: 5 },
      'bear',
      'oid_bear',
    )!
    bear.player = pid
    bear.cycle = 1
    player.cycle = 1
    // band 0: only exact axis alignment wakes (same row here)
    bear.p1 = 8
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100

    memorytickobject(book, board, bear, BEAR_CODE)

    expect(player.x).toBe(6)
    expect(player.y).toBe(5)
    expect(bear.removed).toBeTruthy()
  })
})
