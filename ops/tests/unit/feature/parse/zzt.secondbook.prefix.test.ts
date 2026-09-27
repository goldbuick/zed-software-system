import { loadcoolregionsbowelementlibrary } from 'ops/lib/coolregionsbowbook'
import { importzztboardstobook } from 'zss/feature/parse/zzt'
import { zztparseworld } from 'zss/feature/parse/zztbinparse'
import { exportbooktozzt } from 'zss/feature/parse/zztexport'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'
import {
  memorycreatebook,
  memorywritecodepage,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagename,
  prefixcodepagename,
} from 'zss/memory/codepageoperations'
import {
  memoryimportnameprefix,
  memoryresetbooks,
  memorywritebook,
} from 'zss/memory/session'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

function blankelements(): { type: number; color: number }[] {
  return Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, () => ({
    type: 0,
    color: 0,
  }))
}

function boardwith(
  boardname: string,
  exiteast = 0,
): ZZT_BOARD {
  return {
    boardname,
    elements: blankelements(),
    stats: [{ x: 0, y: 0, cycle: 1, follower: -1, leader: -1, code: '' }],
    maxplayershots: 255,
    isdark: 0,
    exitnorth: 0,
    exitsouth: 0,
    exitwest: 0,
    exiteast,
    restartonzap: 0,
    messagelength: 0,
    message: '',
    timelimit: 0,
  }
}

describe('second content book name prefix', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('prefixes only when a non-main book already exists', () => {
    const main = memorycreatebook([])
    main.name = 'main'
    memoryresetbooks([main], main.id)
    expect(memoryimportnameprefix('Castle.zzt', 'newid')).toBe('')

    const content = memorycreatebook([])
    memorywritebook(content)
    expect(memoryimportnameprefix('Castle.zzt', 'newid')).toBe('castle_')

    const page = memorycreatecodepage('@board castle_000. Title\n', {})
    memorywritecodepage(content, page)
    expect(memoryimportnameprefix('Castle.zzt', 'newid')).toBe('castle_newid_')
  })

  it('prefixes a json page name and leaves the body', () => {
    const page = memorycreatecodepage(
      '@board Town\n@exitnorth zztboard1\n',
      {},
    )
    prefixcodepagename(page, 'castle_')
    expect(page.code.startsWith('@board castle_Town\n')).toBe(true)
    expect(page.code).toContain('@exitnorth zztboard1')
    expect(memoryreadcodepagename(page)).toBe('castle_Town')
  })

  it('writes prefixed board names, addresses, and exits', () => {
    loadcoolregionsbowelementlibrary()
    const { book, boardaddresses } = importzztboardstobook(
      [boardwith('Title', 1), boardwith('Town')],
      {
        startboard: 1,
        tilewidth: BOARD_WIDTH,
        tileheight: BOARD_HEIGHT,
        croppedfromszzt: false,
        prefix: 'castle_',
      },
    )
    expect(boardaddresses).toEqual(['castle_zztboard0', 'castle_zztboard1'])
    expect(book.pages[0].code).toContain('@board castle_000. Title')
    expect(book.pages[0].code).toContain('@castle_zztboard0')
    expect(book.pages[0].code).toContain('@exiteast castle_zztboard1')
    expect(book.pages[0].code).toContain('@title')
    expect(book.pages[1].code).toContain('@zztstartboard')
  })

  it('exports a prefixed zztboard index to the same exit as an unprefixed book', () => {
    loadcoolregionsbowelementlibrary()
    const boards = [boardwith('Title', 1), boardwith('Town')]
    const opts = {
      startboard: 1,
      tilewidth: BOARD_WIDTH,
      tileheight: BOARD_HEIGHT,
      croppedfromszzt: false,
    }
    const plain = exportbooktozzt(importzztboardstobook(boards, opts).book)
    const prefixed = exportbooktozzt(
      importzztboardstobook(boards, { ...opts, prefix: 'castle_' }).book,
    )
    expect(plain.ok).toBe(true)
    expect(prefixed.ok).toBe(true)
    if (!plain.ok || !prefixed.ok) {
      return
    }
    const plainworld = zztparseworld(plain.bytes)
    const prefixedworld = zztparseworld(prefixed.bytes)
    expect(plainworld.ok).toBe(true)
    expect(prefixedworld.ok).toBe(true)
    if (!plainworld.ok || !prefixedworld.ok) {
      return
    }
    expect(prefixedworld.boards[0].exiteast).toBe(plainworld.boards[0].exiteast)
    expect(prefixedworld.boards[0].exiteast).toBeGreaterThan(0)
  })
})
