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

const STAR_CODE = fs
  .readFileSync(
    path.join(__dirname, '../../../fixtures/lang/coolregionsbow/star.zss'),
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

describe('star even-tick dest script', () => {
  it('captures walk seek dest and sends shot, not flow shot', () => {
    const build = compilescript('star', STAR_CODE)
    expect(build.errors ?? []).toEqual([])
    expect(STAR_CODE).toMatch(/#walk seek p3 p4/)
    expect(STAR_CODE).toMatch(/#send by p3 p4 shot/)
    expect(STAR_CODE).toMatch(/any by p3 p4 player/)
    expect(STAR_CODE).toMatch(/any by p3 p4 breakable/)
    expect(STAR_CODE).toMatch(/\?by p3 p4/)
    expect(STAR_CODE).not.toMatch(/#set p5 /)
    expect(STAR_CODE).not.toMatch(/\?seek/)
    expect(STAR_CODE).not.toMatch(/#send flow shot/)
  })
})

describe('star BoardAttack on captured dest', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryhaltallchips()
    memoryresetbooks([])
  })

  function setupdestboard(starx: number, stary: number, playerx: number) {
    expect(firmwarelistcommands(DRIVER_TYPE.RUNTIME)).toContain('walk')
    expect(firmwaregetcommand(DRIVER_TYPE.RUNTIME, 'walk')).toBeTruthy()

    const starpage = memorycreatecodepage(STAR_CODE, {})
    const playerpage = memorycreatecodepage(PLAYER_CODE, {})
    const breakablepage = memorycreatecodepage(BREAKABLE_CODE, {})
    const gempage = memorycreatecodepage(GEM_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([
      starpage,
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
      { x: playerx, y: stary },
      'player',
      pid,
    )!
    const star = memorycreateboardobjectfromkind(
      board,
      { x: starx, y: stary },
      'star',
      'oid_star',
    )!
    star.player = pid
    star.cycle = 1
    player.cycle = 1
    // after #take p2, 100 is even so dest check runs
    star.p2 = 101
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    return { book, board, star, player }
  }

  it('sends shot at captured dest player and dies', () => {
    const { book, board, star, player } = setupdestboard(5, 5, 6)

    memorytickobject(book, board, star, STAR_CODE)

    expect(star.removed).toBeTruthy()
    expect(player.x).toBe(6)
    expect(player.y).toBe(5)
    expect(player.removed).toBeFalsy()
  })

  it('softdeletes dest wall kind breakable and dies', () => {
    const { book, board, star, player } = setupdestboard(5, 5, 10)
    const dest = { x: 6, y: 5 }
    memorywriteterrain(board, {
      x: dest.x,
      y: dest.y,
      kind: 'breakable',
      breakable: 1,
    })

    memorytickobject(book, board, star, STAR_CODE)

    const idx = dest.x + dest.y * BOARD_WIDTH
    expect(board.terrain[idx]?.kind).toBeUndefined()
    expect(star.removed).toBeTruthy()
    expect(player.washurt).toBeUndefined()
  })

  it('does not shot dest gem with @isbreakable and does not die', () => {
    const { book, board, star } = setupdestboard(5, 5, 10)
    const gem = memorycreateboardobjectfromkind(
      board,
      { x: 6, y: 5 },
      'gem',
      'oid_gem',
    )!

    memorytickobject(book, board, star, STAR_CODE)

    expect(star.removed).toBeFalsy()
    expect(board.objects[gem.id!]).toBe(gem)
    expect(gem.removed).toBeFalsy()
    expect(gem.gemshot).toBeUndefined()
    expect(
      memoryreadelement(board, { x: 6, y: 5 }, READ_LAYER.OBJECT)?.kind,
    ).toBe('gem')
  })
})
