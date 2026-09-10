import { apierror } from 'zss/device/api'
import {
  memorycreatebook,
  memoryreadbookflag,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import {
  memoryloginplayer,
  memorylogoutplayer,
} from 'zss/memory/playermanagement'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
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
  return { book, titleid: titlepage.id }
}

describe('endgame logout then login', () => {
  const player = 'pid_12_endgameplayer1'

  afterEach(() => {
    memoryresetbooks([])
    jest.mocked(apierror).mockClear()
  })

  it('relogs onto title after memorylogoutplayer', () => {
    const { book, titleid } = makeplayablebook('world')
    memoryresetbooks([book])
    memorywritemainbook(book.id)

    expect(memoryloginplayer(player, {})).toBe(true)
    expect(memoryreadbookflag(book, player, 'board')).toBe(titleid)

    memorylogoutplayer(player)
    expect(book.activelist).not.toContain(player)
    expect(memoryreadbookflag(book, player, 'board')).toBeFalsy()

    expect(memoryloginplayer(player, {})).toBe(true)
    expect(memoryreadbookflag(book, player, 'board')).toBe(titleid)
    expect(book.activelist).toContain(player)
  })

  it('relogs when title is in another book and player kind is on opened', () => {
    const titlepage = memorycreatecodepage(`@board ${MEMORY_LABEL.TITLE}\n`, {})
    const titlebook = memorycreatebook([titlepage])
    titlebook.name = 'titles'
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(titlepage)!
    board.startx = 1
    board.starty = 1

    const playerpage = memorycreatecodepage(`@${MEMORY_LABEL.PLAYER}\n`, {})
    const opened = memorycreatebook([playerpage])
    opened.name = 'opened'

    memoryresetbooks([opened, titlebook])
    memorywritemainbook(opened.id)

    expect(memoryloginplayer(player, {})).toBe(true)
    memorylogoutplayer(player)
    expect(memoryloginplayer(player, {})).toBe(true)
    expect(memoryreadbookflag(opened, player, 'board')).toBe(titlepage.id)
  })

  it('relogs when player kind is only in another book (pre-regression)', () => {
    const titlepage = memorycreatecodepage(`@board ${MEMORY_LABEL.TITLE}\n`, {})
    const playerpage = memorycreatecodepage(`@${MEMORY_LABEL.PLAYER}\n`, {})
    const lib = memorycreatebook([titlepage, playerpage])
    lib.name = 'lib'
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(titlepage)!
    board.startx = 2
    board.starty = 2

    const opened = memorycreatebook([])
    opened.name = 'opened'

    memoryresetbooks([opened, lib])
    memorywritemainbook(opened.id)

    // Player kind may live in another book (same as title fallback).
    expect(memoryloginplayer(player, {})).toBe(true)
    memorylogoutplayer(player)
    expect(memoryloginplayer(player, {})).toBe(true)
  })
})
