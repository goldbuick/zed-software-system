import { apierror } from 'zss/device/api'
import { createsid } from 'zss/mapping/guid'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreatebook,
  memoryreadbookflag,
  memorywritecodepage,
} from 'zss/memory/bookoperations'
import { memorycreatesoftwarebook } from 'zss/memory/books'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import {
  memoryloginplayer,
  memoryreadbookplayerboards,
  memoryswitchopenedbook,
} from 'zss/memory/playermanagement'
import {
  memorychipispresent,
  memorytickloaders,
  memorytickmain,
  memorytickobject,
} from 'zss/memory/runtime'
import {
  memoryreadmainbook,
  memoryreadroot,
  memoryresetbooks,
  memorywritemainbook,
} from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(() => false),
  apilog: jest.fn(),
}))

function makeplayablebook(name: string) {
  const playerpage = memorycreatecodepage(`@${MEMORY_LABEL.PLAYER}\n`, {})
  const titlepage = memorycreatecodepage(`@board ${MEMORY_LABEL.TITLE}\n`, {})
  const book = memorycreatebook([playerpage, titlepage])
  book.name = name
  const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(titlepage)!
  board.startx = 10
  board.starty = 12
  return book
}

function makeplayeronlybook(name: string) {
  const playerpage = memorycreatecodepage(`@${MEMORY_LABEL.PLAYER}\n`, {})
  const book = memorycreatebook([playerpage])
  book.name = name
  return book
}

function maketitleonlybook(name: string) {
  const titlepage = memorycreatecodepage(`@board ${MEMORY_LABEL.TITLE}\n`, {})
  const book = memorycreatebook([titlepage])
  book.name = name
  const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(titlepage)!
  board.startx = 3
  board.starty = 4
  return { book, titleid: titlepage.id }
}

describe('memoryswitchopenedbook', () => {
  const player = 'pid_12_switchplayer01'

  afterEach(() => {
    memoryboundariesclear()
    memoryresetbooks([])
    jest.mocked(apierror).mockClear()
  })

  it('switches MEMORY.main and places player on dest title when playable', () => {
    const booka = makeplayablebook('world-a')
    const bookb = makeplayablebook('world-b')
    memoryresetbooks([booka, bookb])
    memorywritemainbook(booka.id)

    expect(memoryloginplayer(player, {})).toBe(true)
    expect(memoryreadbookflag(booka, player, 'board')).toBeTruthy()

    expect(memoryswitchopenedbook(bookb.id, [player])).toBe(true)
    expect(memoryreadmainbook()?.id).toBe(bookb.id)
    expect(memoryreadbookflag(booka, player, 'board')).toBeFalsy()
    expect(memoryreadbookflag(bookb, player, 'board')).toBeTruthy()
    expect(bookb.activelist).toContain(player)
  })

  it('halts leftover chips and keeps dest boards on the tick list', () => {
    const booka = makeplayablebook('world-a')
    const bookb = makeplayablebook('world-b')
    memoryresetbooks([booka, bookb])
    memorywritemainbook(booka.id)
    expect(memoryloginplayer(player, {})).toBe(true)

    const titlea = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(
      booka.pages.find((p) => p.code.includes(`@board ${MEMORY_LABEL.TITLE}`))!,
    )!
    const npcid = createsid()
    titlea.objects[npcid] = {
      id: npcid,
      kind: 'guard',
      x: 4,
      y: 4,
      code: '@guard\n/i hello\n#end\n',
      runtime: '',
    }

    memorytickobject(booka, titlea, titlea.objects[npcid], titlea.objects[npcid].code!)
    expect(memorychipispresent(npcid)).toBe(true)

    expect(memoryswitchopenedbook(bookb.id, [player])).toBe(true)
    expect(memorychipispresent(npcid)).toBe(false)

    const boards = memoryreadbookplayerboards(bookb)
    expect(boards.length).toBeGreaterThan(0)
    const before = bookb.timestamp
    memorytickloaders()
    memorytickmain(bookb.timestamp, boards, false)
    expect(bookb.timestamp).toBeGreaterThan(before)
  })

  it('with login false only switches main and leaves players logged out', () => {
    const booka = makeplayablebook('world-a')
    const bookb = makeplayablebook('world-b')
    memoryresetbooks([booka, bookb])
    memorywritemainbook(booka.id)
    expect(memoryloginplayer(player, {})).toBe(true)

    expect(
      memoryswitchopenedbook(bookb.id, [player], { login: false }),
    ).toBe(true)
    expect(memoryreadmainbook()?.id).toBe(bookb.id)
    expect(bookb.activelist).not.toContain(player)
    expect(memoryreadbookflag(bookb, player, 'board')).toBeFalsy()
  })

  it('re-login early return restores activelist when object still on board', () => {
    const book = makeplayablebook('world')
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    expect(memoryloginplayer(player, {})).toBe(true)
    const boardid = memoryreadbookflag(book, player, 'board') as string

    // Simulate broken state: object + board flag remain, activelist dropped
    book.activelist = book.activelist.filter((id) => id !== player)
    expect(book.activelist).not.toContain(player)

    expect(memoryloginplayer(player, {})).toBe(true)
    expect(book.activelist).toContain(player)
    expect(memoryreadbookflag(book, player, 'board')).toBe(boardid)
  })

  it('opens an empty book; still places if title and player exist elsewhere', () => {
    const booka = makeplayablebook('world-a')
    const empty = memorycreatebook([])
    empty.name = 'empty-lib'
    memoryresetbooks([booka, empty])
    memorywritemainbook(booka.id)
    expect(memoryloginplayer(player, {})).toBe(true)

    expect(memoryswitchopenedbook(empty.id, [player])).toBe(true)
    expect(memoryreadmainbook()?.id).toBe(empty.id)
    // title+player available from world-a via cross-book pick
    expect(memoryreadbookflag(empty, player, 'board')).toBeTruthy()
    expect(empty.activelist).toContain(player)
  })

  it('places on another books title when dest has player but no title', () => {
    const { book: titlelib, titleid } = maketitleonlybook('title-lib')
    const dest = makeplayeronlybook('player-only')
    memoryresetbooks([titlelib, dest])
    memorywritemainbook(titlelib.id)

    expect(memoryswitchopenedbook(dest.id, [player])).toBe(true)
    expect(memoryreadmainbook()?.id).toBe(dest.id)
    expect(memoryreadbookflag(dest, player, 'board')).toBe(titleid)
    expect(dest.activelist).toContain(player)
  })

  it('is a no-op when dest is already opened', () => {
    const booka = makeplayablebook('world-a')
    memoryresetbooks([booka])
    memorywritemainbook(booka.id)
    expect(memoryloginplayer(player, {})).toBe(true)
    const boardbefore = memoryreadbookflag(booka, player, 'board')

    expect(memoryswitchopenedbook(booka.id, [player])).toBe(true)
    expect(memoryreadmainbook()?.id).toBe(booka.id)
    expect(memoryreadbookflag(booka, player, 'board')).toBe(boardbefore)
  })

  it('returns false when dest book is missing', () => {
    const booka = makeplayablebook('world-a')
    memoryresetbooks([booka])
    memorywritemainbook(booka.id)
    expect(memoryswitchopenedbook('missing-book-id', [player])).toBe(false)
    expect(memoryreadmainbook()?.id).toBe(booka.id)
  })
})

describe('memoryloginplayer title and player scope', () => {
  afterEach(() => {
    memoryboundariesclear()
    memoryresetbooks([])
    jest.mocked(apierror).mockClear()
  })

  it('borrows title from another book when opened has player', () => {
    const { book: titlelib, titleid } = maketitleonlybook('title-lib')
    const opened = makeplayeronlybook('opened')
    memoryresetbooks([opened, titlelib])
    memorywritemainbook(opened.id)

    const player = 'pid_12_logintitle001'
    expect(memoryloginplayer(player, {})).toBe(true)
    expect(memoryreadbookflag(opened, player, 'board')).toBe(titleid)
  })

  it('borrows player kind from another book when opened has none', () => {
    const { book: titlelib, titleid } = maketitleonlybook('title-lib')
    const playerpage = memorycreatecodepage(`@${MEMORY_LABEL.PLAYER}\n`, {})
    memorywritecodepage(titlelib, playerpage)
    const opened = memorycreatebook([])
    opened.name = 'opened'
    memoryresetbooks([opened, titlelib])
    memorywritemainbook(opened.id)

    const player = 'pid_12_loginborrow001'
    expect(memoryloginplayer(player, {})).toBe(true)
    expect(memoryreadbookflag(opened, player, 'board')).toBe(titleid)
  })
})

describe('memorycreatesoftwarebook', () => {
  afterEach(() => {
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('adds an empty book without changing MEMORY.main', () => {
    const booka = makeplayablebook('world-a')
    memoryresetbooks([booka])
    memorywritemainbook(booka.id)
    const opened = memoryreadroot().main

    const created = memorycreatesoftwarebook('scratch')
    expect(created.pages).toHaveLength(0)
    expect(memoryreadroot().main).toBe(opened)
    expect(memoryreadmainbook()?.id).toBe(booka.id)
  })
})

describe('memorywritemainbook', () => {
  afterEach(() => {
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('stores opened book id and can clear it', () => {
    const book = makeplayablebook('world')
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    expect(memoryreadroot().main).toBe(book.id)
    memorywritemainbook('')
    expect(memoryreadroot().main).toBe('')
  })
})
