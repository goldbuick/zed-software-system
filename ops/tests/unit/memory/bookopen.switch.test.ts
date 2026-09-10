import { apierror } from 'zss/device/api'
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
  memoryswitchopenedbook,
} from 'zss/memory/playermanagement'
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
  afterEach(() => {
    memoryresetbooks([])
    jest.mocked(apierror).mockClear()
  })

  it('switches MEMORY.main only (does not move players)', () => {
    const booka = makeplayablebook('world-a')
    const bookb = makeplayablebook('world-b')
    memoryresetbooks([booka, bookb])
    memorywritemainbook(booka.id)

    const player = 'pid_12_switchplayer01'
    expect(memoryloginplayer(player, {})).toBe(true)
    expect(memoryreadbookflag(booka, player, 'board')).toBeTruthy()

    expect(memoryswitchopenedbook(bookb.id)).toBe(true)
    expect(memoryreadmainbook()?.id).toBe(bookb.id)
    // Player state stays on the book they logged into; switch is main-only.
    expect(memoryreadbookflag(booka, player, 'board')).toBeTruthy()
    expect(bookb.activelist).not.toContain(player)
  })

  it('returns false when dest is already opened', () => {
    const booka = makeplayablebook('world-a')
    memoryresetbooks([booka])
    memorywritemainbook(booka.id)
    expect(memoryswitchopenedbook(booka.id)).toBe(false)
    expect(memoryreadmainbook()?.id).toBe(booka.id)
  })

  it('returns false when dest book is missing', () => {
    const booka = makeplayablebook('world-a')
    memoryresetbooks([booka])
    memorywritemainbook(booka.id)
    expect(memoryswitchopenedbook('missing-book-id')).toBe(false)
    expect(memoryreadmainbook()?.id).toBe(booka.id)
  })
})

describe('memoryloginplayer title and player scope', () => {
  afterEach(() => {
    memoryresetbooks([])
    jest.mocked(apierror).mockClear()
  })

  it('re-login early return restores activelist when object still on board', () => {
    const book = makeplayablebook('world')
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const player = 'pid_12_switchplayer01'
    expect(memoryloginplayer(player, {})).toBe(true)
    const boardid = memoryreadbookflag(book, player, 'board') as string

    book.activelist = book.activelist.filter((id) => id !== player)
    expect(book.activelist).not.toContain(player)

    expect(memoryloginplayer(player, {})).toBe(true)
    expect(book.activelist).toContain(player)
    expect(memoryreadbookflag(book, player, 'board')).toBe(boardid)
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
