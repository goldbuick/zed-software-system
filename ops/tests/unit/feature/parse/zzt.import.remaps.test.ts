import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadcoolregionsbowelementlibrary } from 'ops/lib/coolregionsbowbook'
import { LANG_COOLREGIONSBOW_DIR } from 'ops/lib/fixturepaths'
import { importzztboardstobook } from 'zss/feature/parse/zzt'
import { zztparseworld } from 'zss/feature/parse/zztbinparse'
import { exportbooktozzt } from 'zss/feature/parse/zztexport'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'
import { READ_LAYER, memoryreadelement } from 'zss/memory/boardaccess'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import {
  memoryclearbook,
  memoryresetbooks,
  memorywritebook,
} from 'zss/memory/session'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { NAME } from 'zss/words/types'

const ZZT_TILE_BULLET = 18
const ZZT_TILE_STAR = 15
const ZZT_TILE_HEAD = 44
const ZZT_TILE_SEGMENT = 45

function blankelements(): { type: number; color: number }[] {
  return Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, () => ({
    type: 0,
    color: 0,
  }))
}

function readkindzss(kind: string): string {
  return readFileSync(join(LANG_COOLREGIONSBOW_DIR, `${kind}.zss`), 'utf8')
}

describe('zzt import remaps + kind headers', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('pusher/duplicator/transporter/blinkwall use @step/@shoot dir', () => {
    expect(readkindzss('pusher')).toMatch(/@step dir;March/)
    expect(readkindzss('pusher')).not.toMatch(/@stepx |@stepy /)
    expect(readkindzss('duplicator')).toMatch(/@shoot dir;Source/)
    expect(readkindzss('duplicator')).not.toMatch(/@shootx |@shooty /)
    expect(readkindzss('transporter')).toMatch(/@shoot dir;Facing/)
    expect(readkindzss('transporter')).not.toMatch(/@shootx |@shooty /)
    expect(readkindzss('blinkwall')).toMatch(/@shoot dir;Ray/)
    expect(readkindzss('blinkwall')).not.toMatch(/@shootx |@shooty /)
  })

  it('head/segment are plank stubs with bombed scores', () => {
    const head = readkindzss('head')
    const segment = readkindzss('segment')
    expect(head).toMatch(/:bombed/)
    expect(head).toMatch(/#give score 1/)
    expect(head).not.toMatch(/#pset |#walk |#go /)
    expect(segment).toMatch(/:bombed/)
    expect(segment).toMatch(/#give score 3/)
    expect(segment).not.toMatch(/#morph |#pset /)
  })

  it('star uses ?seek and not #walk seek', () => {
    const star = readkindzss('star')
    expect(star).toMatch(/\?seek/)
    expect(star).not.toMatch(/#walk seek/)
  })

  it('spinninggun uses RoZZT rate, axis-locked intsign aim, and drawdisplay', () => {
    const gun = readkindzss('spinninggun')
    expect(gun).toMatch(/#if random 9 below p2 do/)
    expect(gun).not.toMatch(/#if random 20 below p2/)
    expect(gun).toMatch(/#set p8 intsign playery - thisy/)
    expect(gun).toMatch(/#set p7 intsign playerx - thisx/)
    expect(gun).toMatch(/#shoot by 0 p8/)
    expect(gun).toMatch(/#shoot by p7 0/)
    expect(gun).toMatch(/#if not blocked by 0 p8/)
    expect(gun).toMatch(/#if not blocked by p7 0/)
    expect(gun).not.toMatch(/blocked seek shoot seek/)
    expect(gun).toMatch(/:drawdisplay/)
  })

  it('bear Signum uses intsign one-liners', () => {
    const bear = readkindzss('bear')
    expect(bear).toMatch(/#set p2 intsign playerx - thisx/)
    expect(bear).toMatch(/#set p3 intsign playery - thisy/)
    expect(bear).not.toMatch(/#if p2 below 0 set p2 -1/)
    expect(bear).not.toMatch(/#if p3 below 0 set p3 -1/)
  })

  it('clears step on head/segment import', () => {
    const elements = blankelements()
    const hx = 8
    const hy = 8
    const sx = 8
    const sy = 7
    elements[hy * BOARD_WIDTH + hx] = { type: ZZT_TILE_HEAD, color: 14 }
    elements[sy * BOARD_WIDTH + sx] = { type: ZZT_TILE_SEGMENT, color: 14 }

    const board: ZZT_BOARD = {
      boardname: 'CentipedeStep',
      elements,
      stats: [
        { x: 0, y: 0, cycle: 1, follower: -1, leader: -1, code: '' },
        {
          x: hx,
          y: hy,
          cycle: 2,
          stepx: 1,
          stepy: 0,
          follower: 2,
          leader: -1,
        },
        {
          x: sx,
          y: sy,
          cycle: 2,
          stepx: 0,
          stepy: -1,
          follower: -1,
          leader: 1,
        },
      ],
      maxplayershots: 255,
      isdark: 0,
      exitnorth: 0,
      exitsouth: 0,
      exitwest: 0,
      exiteast: 0,
      restartonzap: 0,
      messagelength: 0,
      message: '',
      timelimit: 0,
    }

    loadcoolregionsbowelementlibrary()
    const { book, boardaddresses } = importzztboardstobook([board], {
      tilewidth: BOARD_WIDTH,
      tileheight: BOARD_HEIGHT,
      croppedfromszzt: false,
    })
    memorywritebook(book)

    const memboard = memoryreadboardbyaddress(boardaddresses[0])
    const head = memoryreadelement(memboard, { x: hx, y: hy }, READ_LAYER.ANY)
    const seg = memoryreadelement(memboard, { x: sx, y: sy }, READ_LAYER.ANY)
    expect(NAME(head?.kind ?? '')).toBe('head')
    expect(NAME(seg?.kind ?? '')).toBe('segment')
    expect(head?.stepx ?? 0).toBe(0)
    expect(head?.stepy ?? 0).toBe(0)
    expect(seg?.stepx ?? 0).toBe(0)
    expect(seg?.stepy ?? 0).toBe(0)

    memoryclearbook(book.id)
  })

  it('keeps ZZT Step on star import', () => {
    const elements = blankelements()
    const x = 4
    const y = 4
    elements[y * BOARD_WIDTH + x] = { type: ZZT_TILE_STAR, color: 14 }

    const board: ZZT_BOARD = {
      boardname: 'StarStep',
      elements,
      stats: [
        { x: 0, y: 0, cycle: 1, follower: -1, leader: -1, code: '' },
        {
          x,
          y,
          cycle: 1,
          stepx: -1,
          stepy: 0,
          follower: -1,
          leader: -1,
          code: '',
        },
      ],
      maxplayershots: 255,
      isdark: 0,
      exitnorth: 0,
      exitsouth: 0,
      exitwest: 0,
      exiteast: 0,
      restartonzap: 0,
      messagelength: 0,
      message: '',
      timelimit: 0,
    }

    loadcoolregionsbowelementlibrary()
    const { book, boardaddresses } = importzztboardstobook([board], {
      tilewidth: BOARD_WIDTH,
      tileheight: BOARD_HEIGHT,
      croppedfromszzt: false,
    })
    memorywritebook(book)

    const memboard = memoryreadboardbyaddress(boardaddresses[0])
    const star = memoryreadelement(memboard, { x, y }, READ_LAYER.ANY)
    expect(NAME(star?.kind ?? '')).toBe('star')
    expect(star?.stepx).toBe(-1)
    expect(star?.stepy ?? 0).toBe(0)

    memoryclearbook(book.id)
  })

  it('maps bullet P1 0 to party pid_zztimport and drops p1', () => {
    const elements = blankelements()
    const x = 6
    const y = 6
    elements[y * BOARD_WIDTH + x] = { type: ZZT_TILE_BULLET, color: 15 }

    const board: ZZT_BOARD = {
      boardname: 'BulletPlayer',
      elements,
      stats: [
        { x: 0, y: 0, cycle: 1, follower: -1, leader: -1, code: '' },
        {
          x,
          y,
          cycle: 1,
          p1: 0,
          stepx: 1,
          stepy: 0,
          follower: -1,
          leader: -1,
          code: '',
        },
      ],
      maxplayershots: 255,
      isdark: 0,
      exitnorth: 0,
      exitsouth: 0,
      exitwest: 0,
      exiteast: 0,
      restartonzap: 0,
      messagelength: 0,
      message: '',
      timelimit: 0,
    }

    loadcoolregionsbowelementlibrary()
    const { book, boardaddresses } = importzztboardstobook([board], {
      tilewidth: BOARD_WIDTH,
      tileheight: BOARD_HEIGHT,
      croppedfromszzt: false,
    })
    memorywritebook(book)

    const memboard = memoryreadboardbyaddress(boardaddresses[0])
    const bullet = memoryreadelement(memboard, { x, y }, READ_LAYER.ANY)
    expect(NAME(bullet?.kind ?? '')).toBe('bullet')
    expect(bullet?.party).toBe('pid_zztimport')
    expect(bullet?.p1).toBeUndefined()

    memoryclearbook(book.id)
  })

  it('drops enemy bullet p1 and leaves party unset', () => {
    const elements = blankelements()
    const x = 7
    const y = 7
    elements[y * BOARD_WIDTH + x] = { type: ZZT_TILE_BULLET, color: 15 }

    const board: ZZT_BOARD = {
      boardname: 'BulletEnemy',
      elements,
      stats: [
        { x: 0, y: 0, cycle: 1, follower: -1, leader: -1, code: '' },
        {
          x,
          y,
          cycle: 1,
          p1: 1,
          stepx: 0,
          stepy: -1,
          follower: -1,
          leader: -1,
          code: '',
        },
      ],
      maxplayershots: 255,
      isdark: 0,
      exitnorth: 0,
      exitsouth: 0,
      exitwest: 0,
      exiteast: 0,
      restartonzap: 0,
      messagelength: 0,
      message: '',
      timelimit: 0,
    }

    loadcoolregionsbowelementlibrary()
    const { book, boardaddresses } = importzztboardstobook([board], {
      tilewidth: BOARD_WIDTH,
      tileheight: BOARD_HEIGHT,
      croppedfromszzt: false,
    })
    memorywritebook(book)

    const memboard = memoryreadboardbyaddress(boardaddresses[0])
    const bullet = memoryreadelement(memboard, { x, y }, READ_LAYER.ANY)
    expect(NAME(bullet?.kind ?? '')).toBe('bullet')
    expect(bullet?.party).toBeUndefined()
    expect(bullet?.p1).toBeUndefined()

    memoryclearbook(book.id)
  })

  it('exports bullet party back to P1 0/1', () => {
    const elements = blankelements()
    const px = 3
    const py = 3
    const ex = 5
    const ey = 5
    elements[py * BOARD_WIDTH + px] = { type: ZZT_TILE_BULLET, color: 15 }
    elements[ey * BOARD_WIDTH + ex] = { type: ZZT_TILE_BULLET, color: 14 }

    const board: ZZT_BOARD = {
      boardname: 'BulletExport',
      elements,
      stats: [
        { x: 0, y: 0, cycle: 1, follower: -1, leader: -1, code: '' },
        {
          x: px,
          y: py,
          cycle: 1,
          p1: 0,
          stepx: 1,
          stepy: 0,
          follower: -1,
          leader: -1,
          code: '',
        },
        {
          x: ex,
          y: ey,
          cycle: 1,
          p1: 1,
          stepx: -1,
          stepy: 0,
          follower: -1,
          leader: -1,
          code: '',
        },
      ],
      maxplayershots: 255,
      isdark: 0,
      exitnorth: 0,
      exitsouth: 0,
      exitwest: 0,
      exiteast: 0,
      restartonzap: 0,
      messagelength: 0,
      message: '',
      timelimit: 0,
    }

    loadcoolregionsbowelementlibrary()
    const { book } = importzztboardstobook([board], {
      tilewidth: BOARD_WIDTH,
      tileheight: BOARD_HEIGHT,
      croppedfromszzt: false,
    })
    memorywritebook(book)

    const exported = exportbooktozzt(book)
    expect(exported.ok).toBe(true)
    if (!exported.ok) {
      return
    }

    const parsed = zztparseworld(exported.bytes)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    const out = parsed.boards[0]
    expect(out).toBeDefined()
    const playerstat = out!.stats.find((s) => s.x === px && s.y === py)
    const enemystat = out!.stats.find((s) => s.x === ex && s.y === ey)
    expect(playerstat?.p1).toBe(0)
    expect(enemystat?.p1).toBe(1)

    memoryclearbook(book.id)
  })
})
