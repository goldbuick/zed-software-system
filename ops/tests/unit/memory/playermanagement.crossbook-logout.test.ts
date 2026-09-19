/**
 * Logout must purge player objects on boards in non-main loaded books.
 * Otherwise memoryscanplayers (via host board address) reattaches the pid.
 */
import { memorycreateboard } from 'zss/memory/boardlifecycle'
import {
  memorycreatebook,
  memoryreadflag,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import {
  memorydebugcountplayerboards,
  memoryloginplayer,
  memorylogoutplayer,
  memoryreadbookplayeractive,
  memoryscanplayers,
  memorywritebookplayerboard,
} from 'zss/memory/playermanagement'
import {
  memoryreadmainbook,
  memoryresetbooks,
  memorywritemainbook,
} from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

describe('logout purge across loaded books', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('clears foreign pid on non-main book board so scan does not reattach', () => {
    const host = 'pid_12_hostplayer01'
    const foreign = 'pid_12_foreignplayer'
    const othersid = 'sid_other_crossbook'

    const playerpage = memorycreatecodepage(`@${MEMORY_LABEL.PLAYER}\n`, {
      object: { name: MEMORY_LABEL.PLAYER },
    })
    const titlea = memorycreatecodepage(`@board ${MEMORY_LABEL.TITLE}\n`, {})
    const booka = memorycreatebook([playerpage, titlea])
    booka.name = 'mainbook'

    const titleb = memorycreatecodepage(`@board ${MEMORY_LABEL.TITLE}\n`, {})
    const room = memorycreateboard()
    room.id = othersid
    const roompage = memorycreatecodepage('@board room\n', { board: room })
    roompage.id = othersid
    memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(roompage)
    const bookb = memorycreatebook([titleb, roompage])
    bookb.name = 'otherbook'

    memoryresetbooks([booka, bookb])
    memorywritemainbook(booka.id)

    expect(memoryloginplayer(host, {})).toBe(true)

    const dest = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(roompage)!
    memorywritebookplayerboard(booka, host, dest.id)
    dest.objects[host] = {
      id: host,
      kind: MEMORY_LABEL.PLAYER,
      x: 2,
      y: 2,
      player: host,
    }
    const atitle = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(titlea)
    if (atitle?.objects[host]) {
      delete atitle.objects[host]
    }

    // Foreign player body lives only on the non-main book board (live multi-book).
    dest.objects[foreign] = {
      id: foreign,
      kind: MEMORY_LABEL.PLAYER,
      x: 4,
      y: 4,
      player: foreign,
    }
    memorywritebookplayerboard(booka, foreign, dest.id)
    expect(memoryreadflag(booka, foreign, 'board')).toBe(othersid)
    expect(memoryreadbookplayeractive(booka, foreign)).toBe(true)
    expect(memorydebugcountplayerboards(foreign).count).toBe(1)

    memorylogoutplayer(foreign)

    expect(memorydebugcountplayerboards(foreign).count).toBe(0)
    expect(dest.objects[foreign]).toBeUndefined()
    expect(memoryreadbookplayeractive(booka, foreign)).toBe(false)

    // Host still on that board — scan would reattach if the object survived.
    const tracking: Record<string, number> = {}
    memoryscanplayers(tracking)
    expect(tracking[foreign]).toBeUndefined()
    expect(memoryreadbookplayeractive(booka, foreign)).toBe(false)
    expect(dest.objects[foreign]).toBeUndefined()
    expect(memoryreadmainbook()?.activelist.includes(host)).toBe(true)
  })
})
