import {
  DRIVER_TYPE,
  firmwaregetcommand,
  firmwarelistcommands,
} from 'zss/firmware/runner'
import { compilescript } from 'zss/feature/lang/langcompileclient'
import { cleartickreadcontextall } from 'zss/firmware/runtime'
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
import { memoryhaltallchips, memorytickobject } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { BOARD_WIDTH, CODE_PAGE_TYPE } from 'zss/memory/types'
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

const BREAKABLE_CODE = `@terrain breakable
@issolid
@isbreakable
@char 254
`

const GEM_CODE = `@object gem
@issolid
@isbreakable
@char 4
#end
:shot
#set gemshot 1
#end
`

describe('bear RoZZT contact script', () => {
  it('uses p2/p3 deltas, ispushable, no thud', () => {
    const build = compilescript('bear', BEAR_CODE)
    expect(build.errors ?? []).toEqual([])
    expect(BEAR_CODE).toMatch(/@ispushable/)
    expect(BEAR_CODE).not.toMatch(/:thud/)
    expect(BEAR_CODE).toMatch(/#set p2 0/)
    expect(BEAR_CODE).toMatch(/#set p3 0/)
    expect(BEAR_CODE).toMatch(/#send by p2 p3 shot/)
    expect(BEAR_CODE).toMatch(/any by p2 p3 breakable/)
    expect(BEAR_CODE).toMatch(/\?by p2 p3/)
    expect(BEAR_CODE).toMatch(/:touch\n#send at senderx sendery shot\n#die/)
    expect(BEAR_CODE).not.toMatch(/@light /)
  })
})

describe('bear BoardAttack on adjacent pushable player', () => {
  afterEach(() => {
    cleartickreadcontextall()
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

describe('bear dest kind breakable vs @isbreakable gem', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryhaltallchips()
    memoryresetbooks([])
  })

  function setupdestboard() {
    const bearpage = memorycreatecodepage(BEAR_CODE, {})
    const playerpage = memorycreatecodepage(PLAYER_CODE, {})
    const breakablepage = memorycreatecodepage(BREAKABLE_CODE, {})
    const gempage = memorycreatecodepage(GEM_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([
      bearpage,
      playerpage,
      breakablepage,
      gempage,
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
      { x: 8, y: 5 },
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
    bear.p1 = 8
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    return { book, board, bear, player }
  }

  it('softdeletes dest wall kind breakable and dies', () => {
    const { book, board, bear, player } = setupdestboard()
    const dest = { x: 6, y: 5 }
    memorywriteterrain(board, {
      x: dest.x,
      y: dest.y,
      kind: 'breakable',
      breakable: 1,
    })

    memorytickobject(book, board, bear, BEAR_CODE)

    const idx = dest.x + dest.y * BOARD_WIDTH
    expect(board.terrain[idx]?.kind).toBeUndefined()
    expect(bear.removed).toBeTruthy()
    expect(player.washurt).toBeUndefined()
  })

  it('does not shot dest gem with @isbreakable and does not die', () => {
    const { book, board, bear } = setupdestboard()
    const gem = memorycreateboardobjectfromkind(
      board,
      { x: 6, y: 5 },
      'gem',
      'oid_gem',
    )!

    memorytickobject(book, board, bear, BEAR_CODE)

    expect(bear.removed).toBeFalsy()
    expect(board.objects[gem.id!]).toBe(gem)
    expect(gem.removed).toBeFalsy()
    expect(gem.gemshot).toBeUndefined()
    expect(
      memoryreadelement(board, { x: 6, y: 5 }, READ_LAYER.OBJECT)?.kind,
    ).toBe('gem')
  })
})
