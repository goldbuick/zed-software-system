import { READ_LAYER, memoryreadelement } from 'zss/memory/boardaccess'
import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import {
  memorycreatebook,
  memorywriteflag,
  memorywritecodepage,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memoryreadelementstat } from 'zss/memory/boards'
import { memorymoveplayertoboard } from 'zss/memory/playermanagement'
import * as runtime from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import {
  BOARD,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION, PT } from 'zss/words/types'

describe('memorymoveplayertoboard occupancy', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('moves player between boards and updates occupancy by x/y', () => {
    const playerpage = memorycreatecodepage('@player\n', {})
    const boarda = memorycreatecodepage('@board src\n', {})
    const boardb = memorycreatecodepage('@board dest\n', {})
    const book = memorycreatebook([playerpage, boarda, boardb])
    memoryresetbooks([book])
    memorywritemainbook(book.id)

    const src = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boarda)!
    const dest = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardb)!
    src.id = boarda.id
    dest.id = boardb.id

    memoryensureboardready(src)
    memoryensureboardready(dest)

    const player = 'pid_testplayer01'
    const obj = memorycreateboardobjectfromkind(
      src,
      { x: 5, y: 5 },
      MEMORY_LABEL.PLAYER,
      player,
    )
    expect(obj?.id).toBe(player)
    memorywriteflag(book, player, 'board', src.id)

    expect(memoryreadelement(src, { x: 5, y: 5 }, READ_LAYER.OBJECT)?.id).toBe(
      player,
    )

    const ok = memorymoveplayertoboard(book, player, dest.id, { x: 2, y: 3 })
    expect(ok).toBe(true)
    expect(src.objects[player]).toBeUndefined()
    expect(dest.objects[player]).toBeDefined()
    expect(
      memoryreadelement(src, { x: 5, y: 5 }, READ_LAYER.OBJECT),
    ).toBeUndefined()
    expect(memoryreadelement(dest, { x: 2, y: 3 }, READ_LAYER.OBJECT)?.id).toBe(
      player,
    )

    // second hop must still see CATEGORY.ISOBJECT (runtime preserved on unlink)
    const boardc = memorycreatecodepage('@board third\n', {})
    memorywritecodepage(book, boardc)
    const third = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardc)!
    third.id = boardc.id
    memoryensureboardready(third)

    const ok2 = memorymoveplayertoboard(book, player, third.id, { x: 1, y: 1 })
    expect(ok2).toBe(true)
    expect(dest.objects[player]).toBeUndefined()
    expect(third.objects[player]).toBeDefined()
    expect(
      memoryreadelement(third, { x: 1, y: 1 }, READ_LAYER.OBJECT)?.id,
    ).toBe(player)
  })
})

describe('memorymoveplayertoboard blocked entry', () => {
  const PLAYER = 'pid_testplayer01'
  const OTHER = 'pid_testplayer02'
  const DESTPT = { x: 2, y: 3 }
  let messagechip: jest.SpiedFunction<typeof runtime.memorymessagechip>

  afterEach(() => {
    messagechip.mockRestore()
    READ_CONTEXT.board = undefined
    READ_CONTEXT.book = undefined
    memoryresetbooks([])
  })

  function setup(extras: CODE_PAGE[] = []) {
    messagechip = jest
      .spyOn(runtime, 'memorymessagechip')
      .mockImplementation(() => {})
    const playerpage = memorycreatecodepage('@player\n', {})
    const boarda = memorycreatecodepage('@board src\n', {})
    const boardb = memorycreatecodepage('@board dest\n', {})
    const book = memorycreatebook([playerpage, boarda, boardb, ...extras])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const src = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boarda)!
    const dest = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardb)!
    src.id = boarda.id
    dest.id = boardb.id
    memoryensureboardready(src)
    memoryensureboardready(dest)
    const player = memorycreateboardobjectfromkind(
      src,
      { x: 5, y: 5 },
      MEMORY_LABEL.PLAYER,
      PLAYER,
    )!
    memorywriteflag(book, PLAYER, 'board', src.id)
    READ_CONTEXT.book = book
    READ_CONTEXT.board = dest
    return { book, src, dest, player }
  }

  function touchtargets() {
    return messagechip.mock.calls
      .map((call) => (call[0] as { target?: string }).target ?? '')
      .filter((target) => target.endsWith(':touch'))
  }

  function move(book: BOOK, dest: BOARD, pushdir?: PT) {
    return memorymoveplayertoboard(book, PLAYER, dest.id, DESTPT, pushdir)
  }

  it('refuses a wall and leaves the player on the source board', () => {
    const { book, src, dest } = setup()
    dest.terrain[DESTPT.x + DESTPT.y * BOARD_WIDTH] = {
      kind: 'solid',
      collision: COLLISION.ISSOLID,
      x: DESTPT.x,
      y: DESTPT.y,
    }

    expect(move(book, dest)).toBe(false)
    expect(src.objects[PLAYER]).toBeDefined()
    expect(dest.objects[PLAYER]).toBeUndefined()
    expect(touchtargets()).toEqual([])
  })

  it('refuses a non-pushable object and sends touch', () => {
    const { book, src, dest } = setup()
    const crate = memorycreateboardobjectfromkind(
      dest,
      DESTPT,
      'crate',
      'oid_crate',
    )!

    expect(move(book, dest, { x: 1, y: 0 })).toBe(false)
    expect(src.objects[PLAYER]).toBeDefined()
    expect(dest.objects[PLAYER]).toBeUndefined()
    expect(crate.x).toBe(DESTPT.x)
    expect(crate.y).toBe(DESTPT.y)
    expect(touchtargets()).toEqual(['oid_crate:touch'])
  })

  it('pushes a pushable object into an open cell and sends touch', () => {
    const rockpage = memorycreatecodepage('@object rock\n@ispushable\n', {})
    const { book, src, dest } = setup([rockpage])
    const rock = memorycreateboardobjectfromkind(
      dest,
      DESTPT,
      'rock',
      'oid_rock',
    )!
    expect(memoryreadelementstat(rock, 'pushable')).toBe(1)

    expect(move(book, dest, { x: 1, y: 0 })).toBe(true)
    expect(src.objects[PLAYER]).toBeUndefined()
    expect(dest.objects[PLAYER]?.x).toBe(DESTPT.x)
    expect(dest.objects[PLAYER]?.y).toBe(DESTPT.y)
    expect(rock.x).toBe(DESTPT.x + 1)
    expect(rock.y).toBe(DESTPT.y)
    expect(touchtargets()).toEqual(['oid_rock:touch'])
  })

  it('refuses a pushable object blocked by a wall and still sends touch', () => {
    const rockpage = memorycreatecodepage('@object rock\n@ispushable\n', {})
    const { book, src, dest } = setup([rockpage])
    const rock = memorycreateboardobjectfromkind(
      dest,
      DESTPT,
      'rock',
      'oid_rock',
    )!
    dest.terrain[DESTPT.x + 1 + DESTPT.y * BOARD_WIDTH] = {
      kind: 'solid',
      collision: COLLISION.ISSOLID,
      x: DESTPT.x + 1,
      y: DESTPT.y,
    }

    expect(move(book, dest, { x: 1, y: 0 })).toBe(false)
    expect(src.objects[PLAYER]).toBeDefined()
    expect(dest.objects[PLAYER]).toBeUndefined()
    expect(rock.x).toBe(DESTPT.x)
    expect(rock.y).toBe(DESTPT.y)
    expect(touchtargets()).toEqual(['oid_rock:touch'])
  })

  it('does not push a north-south slider when entered from the east', () => {
    const sliderpage = memorycreatecodepage(
      '@object slider\n@ispushable n s\n',
      {},
    )
    const { book, src, dest } = setup([sliderpage])
    const slider = memorycreateboardobjectfromkind(
      dest,
      DESTPT,
      'slider',
      'oid_slider',
    )!
    expect(memoryreadelementstat(slider, 'pushable')).toBe('n s')

    expect(move(book, dest, { x: -1, y: 0 })).toBe(false)
    expect(src.objects[PLAYER]).toBeDefined()
    expect(dest.objects[PLAYER]).toBeUndefined()
    expect(slider.x).toBe(DESTPT.x)
    expect(slider.y).toBe(DESTPT.y)
    expect(touchtargets()).toEqual(['oid_slider:touch'])
  })

  it('crosses onto an item and sends touch', () => {
    const gempage = memorycreatecodepage('@object gem\n@isitem\n', {})
    const { book, src, dest } = setup([gempage])
    const gem = memorycreateboardobjectfromkind(dest, DESTPT, 'gem', 'oid_gem')!
    expect(memoryreadelementstat(gem, 'item')).toBe(1)

    expect(move(book, dest)).toBe(true)
    expect(src.objects[PLAYER]).toBeUndefined()
    expect(dest.objects[PLAYER]?.x).toBe(DESTPT.x)
    expect(dest.objects[PLAYER]?.y).toBe(DESTPT.y)
    expect(gem.x).toBe(DESTPT.x)
    expect(gem.y).toBe(DESTPT.y)
    expect(touchtargets()).toEqual(['oid_gem:touch'])
  })

  it('crosses onto another player', () => {
    const { book, src, dest } = setup()
    memorycreateboardobjectfromkind(dest, DESTPT, MEMORY_LABEL.PLAYER, OTHER)

    expect(move(book, dest)).toBe(true)
    expect(src.objects[PLAYER]).toBeUndefined()
    expect(dest.objects[PLAYER]?.x).toBe(DESTPT.x)
    expect(dest.objects[OTHER]?.x).toBe(DESTPT.x)
    expect(touchtargets()).toEqual([])
  })
})
