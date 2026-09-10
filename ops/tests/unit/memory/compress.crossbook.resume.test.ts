import { memorycreateboard } from 'zss/memory/boardlifecycle'
import { memoryboundariesclear } from 'zss/memory/boundaries'
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
  memoryreadplayerboard,
  memorywritebookplayerboard,
} from 'zss/memory/playermanagement'
import {
  memoryreadmainbook,
  memoryresetbooks,
  memorywritemainbook,
} from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'
import {
  memorycompressbooks,
  memorydecompressbooks,
} from 'zss/memory/utilities'

/**
 * Opened book A holds flags.board + activelist; player object lives on book B.
 * Per-book dense remap used to remint B's page/player and leave A's flags on a
 * dead sid — login plotted title. Multi-book compress must protect cross refs.
 */
describe('compress cross-book resume', () => {
  afterEach(() => {
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('keeps flags.board and objects[pid] when player is on a non-main book board', async () => {
    const player = 'pid_12_crossbook01'
    const playerpage = memorycreatecodepage(`@${MEMORY_LABEL.PLAYER}\n`, {})
    const titlea = memorycreatecodepage(`@board ${MEMORY_LABEL.TITLE}\n`, {})
    const booka = memorycreatebook([playerpage, titlea])
    booka.name = 'darkpianoshammer'

    const titleb = memorycreatecodepage(`@board ${MEMORY_LABEL.TITLE}\n`, {})
    const room = memorycreateboard()
    const roompage = memorycreatecodepage('@board room\n', { board: room })
    memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(roompage)
    const bookb = memorycreatebook([
      titleb,
      roompage,
      memorycreatecodepage('@board pad0\n', { board: memorycreateboard() }),
      memorycreatecodepage('@board pad1\n', { board: memorycreateboard() }),
      memorycreatecodepage('@board pad2\n', { board: memorycreateboard() }),
    ])
    bookb.name = 'DEMO'

    memoryresetbooks([booka, bookb])
    memorywritemainbook(booka.id)

    expect(memoryloginplayer(player, {})).toBe(true)
    const dest = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(roompage)!
    memorywritebookplayerboard(booka, player, dest.id)
    dest.objects[player] = {
      id: player,
      kind: MEMORY_LABEL.PLAYER,
      x: 3,
      y: 4,
      player,
      runtime: '',
    }
    const atitle = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(titlea)
    if (atitle?.objects[player]) {
      delete atitle.objects[player]
    }

    expect(memoryreadbookflag(booka, player, 'board')).toBe(roompage.id)

    const compressed = await memorycompressbooks([booka, bookb])
    memoryboundariesclear()
    const bundle = await memorydecompressbooks(compressed)
    memoryresetbooks(bundle.books, bundle.main)

    const main = memoryreadmainbook()!
    expect(main.name).toBe('darkpianoshammer')
    const resolved = memoryreadplayerboard(player)
    expect(resolved).toBeDefined()
    expect(resolved?.objects[player]).toBeDefined()
    expect(memoryloginplayer(player, {})).toBe(true)
    expect(memoryreadplayerboard(player)?.objects[player]).toBeDefined()
  })
})
