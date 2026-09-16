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

const LION_CODE = fs
  .readFileSync(
    path.join(__dirname, '../../../fixtures/lang/coolregionsbow/lion.zss'),
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

const WALL_CODE = `@terrain wall
@issolid
@char 178
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

describe('lion dest script', () => {
  it('captures walk dest player then ?by', () => {
    const build = compilescript('lion', LION_CODE)
    expect(build.errors ?? []).toEqual([])
    expect(LION_CODE).toMatch(/#walk rnd p2 p3/)
    expect(LION_CODE).toMatch(/#walk seek p2 p3/)
    expect(LION_CODE).toMatch(/#send by p2 p3 shot/)
    expect(LION_CODE).toMatch(/\?by p2 p3/)
    expect(LION_CODE).toMatch(/:touch\n#send at senderx sendery shot\n#die/)
    expect(LION_CODE).not.toMatch(/any by p2 p3 breakable/)
    expect(LION_CODE).not.toMatch(/\?seek/)
  })
})

describe('lion BoardAttack on captured dest', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryhaltallchips()
    memoryresetbooks([])
  })

  function setupdestboard(lionx: number, liony: number, playerx: number) {
    expect(firmwarelistcommands(DRIVER_TYPE.RUNTIME)).toContain('walk')
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'walk')).toBeTruthy()

    const lionpage = memorycreatecodepage(LION_CODE, {})
    const playerpage = memorycreatecodepage(PLAYER_CODE, {})
    const breakablepage = memorycreatecodepage(BREAKABLE_CODE, {})
    const wallpage = memorycreatecodepage(WALL_CODE, {})
    const gempage = memorycreatecodepage(GEM_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([
      lionpage,
      playerpage,
      breakablepage,
      wallpage,
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
      { x: playerx, y: liony },
      'player',
      pid,
    )!
    const lion = memorycreateboardobjectfromkind(
      board,
      { x: lionx, y: liony },
      'lion',
      'oid_lion',
    )!
    lion.player = pid
    lion.cycle = 1
    player.cycle = 1
    // p1 below random 10 is always false when p1 is 10
    lion.p1 = 10
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    return { book, board, lion, player }
  }

  it('sends shot at dest player and dies without shoving', () => {
    const { book, board, lion, player } = setupdestboard(5, 5, 6)

    memorytickobject(book, board, lion, LION_CODE)

    expect(lion.removed).toBeTruthy()
    expect(player.x).toBe(6)
    expect(player.y).toBe(5)
    expect(player.removed).toBeFalsy()
  })

  it('does not shot dest wall and lives', () => {
    const { book, board, lion, player } = setupdestboard(5, 5, 10)
    const dest = { x: 6, y: 5 }
    memorywriteterrain(board, {
      x: dest.x,
      y: dest.y,
      kind: 'wall',
    })

    memorytickobject(book, board, lion, LION_CODE)

    expect(lion.removed).toBeFalsy()
    expect(lion.x).toBe(5)
    expect(lion.y).toBe(5)
    expect(player.washurt).toBeUndefined()
    expect(
      memoryreadelement(board, dest, READ_LAYER.TERRAIN)?.kind,
    ).toBe('wall')
  })

  it('does not shot dest kind breakable and lives', () => {
    const { book, board, lion, player } = setupdestboard(5, 5, 10)
    const dest = { x: 6, y: 5 }
    memorywriteterrain(board, {
      x: dest.x,
      y: dest.y,
      kind: 'breakable',
      breakable: 1,
    })

    memorytickobject(book, board, lion, LION_CODE)

    const idx = dest.x + dest.y * BOARD_WIDTH
    expect(board.terrain[idx]?.kind).toBe('breakable')
    expect(lion.removed).toBeFalsy()
    expect(player.washurt).toBeUndefined()
  })

  it('does not shot dest gem with @isbreakable and does not die', () => {
    const { book, board, lion } = setupdestboard(5, 5, 10)
    const gem = memorycreateboardobjectfromkind(
      board,
      { x: 6, y: 5 },
      'gem',
      'oid_gem',
    )!

    memorytickobject(book, board, lion, LION_CODE)

    expect(lion.removed).toBeFalsy()
    expect(board.objects[gem.id!]).toBe(gem)
    expect(gem.removed).toBeFalsy()
    expect(gem.gemshot).toBeUndefined()
    expect(
      memoryreadelement(board, { x: 6, y: 5 }, READ_LAYER.OBJECT)?.kind,
    ).toBe('gem')
  })
})
