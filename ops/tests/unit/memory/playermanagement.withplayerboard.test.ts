import * as arraymod from 'zss/mapping/array'
import { createtrackingid } from 'zss/mapping/guid'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
import {
  memorycreatebook,
  memoryreadbookflags,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryimportcodepagefromjson,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import {
  memorypicknextactiveplayerboard,
  memorywritebookplayerboard,
} from 'zss/memory/playermanagement'
import { memoryensureboardelementruntime } from 'zss/memory/runtimeboundary'
import {
  memoryreadbookbysoftware,
  memoryresetbooks,
} from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'
import { CATEGORY } from 'zss/words/types'

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(() => false),
}))

function makeboardpage(name: string, pageid: string) {
  const page = memoryimportcodepagefromjson({
    id: pageid,
    code: `@board ${name}\n`,
    board: {
      id: pageid,
      name,
      terrain: [],
      objects: {},
    },
  })
  if (!page) {
    throw new Error(`failed to create board page ${pageid}`)
  }
  return page
}

function placeplayer(boardid: string, player: string, x: number, y: number) {
  const main = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const page = main?.pages.find((p) => p.id === boardid)
  const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(page)
  if (!board) {
    throw new Error(`no board ${boardid}`)
  }
  const obj = memorycreateboardobjectfromkind(
    board,
    { x, y },
    MEMORY_LABEL.PLAYER,
    player,
  )
  if (obj) {
    memoryensureboardelementruntime(obj).category = CATEGORY.ISOBJECT
    obj.player = player
  }
  return board
}

describe('memorypicknextactiveplayerboard', () => {
  const boarda = 'sid_board_a____'
  const boardb = 'sid_board_b____'
  const playera = 'pid_12_aaaaaaaaaaaaaa'
  const playerb = 'pid_12_bbbbbbbbbbbbbb'

  beforeEach(() => {
    memoryboundariesclear()
    const playerkind = memorycreatecodepage(`@${MEMORY_LABEL.PLAYER}\n`, {
      object: { name: MEMORY_LABEL.PLAYER },
    })
    const book = memorycreatebook([
      playerkind,
      makeboardpage('room-a', boarda),
      makeboardpage('room-b', boardb),
    ])
    book.name = 'main'
    memoryresetbooks([book])
    jest.spyOn(arraymod, 'shuffle').mockImplementation((arr) => [...arr])
  })

  afterEach(() => {
    jest.restoreAllMocks()
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('returns undefined when no active players', () => {
    expect(memorypicknextactiveplayerboard()).toBeUndefined()
  })

  it('cycles each active player once then reshuffles', () => {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    placeplayer(boarda, playera, 1, 1)
    placeplayer(boardb, playerb, 2, 2)
    memorywritebookplayerboard(mainbook, playera, boarda)
    memorywritebookplayerboard(mainbook, playerb, boardb)

    const first = memorypicknextactiveplayerboard()
    const second = memorypicknextactiveplayerboard()
    expect([first?.id, second?.id].sort()).toEqual([boarda, boardb].sort())
    expect(first?.id).not.toBe(second?.id)

    // third call starts a new shuffled round (spy returns activelist order)
    const third = memorypicknextactiveplayerboard()
    expect(third?.id).toBe(first?.id)
  })

  it('skips stale players removed from activelist mid-queue', () => {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    placeplayer(boarda, playera, 1, 1)
    placeplayer(boardb, playerb, 2, 2)
    memorywritebookplayerboard(mainbook, playera, boarda)
    memorywritebookplayerboard(mainbook, playerb, boardb)

    const first = memorypicknextactiveplayerboard()
    expect(first?.id).toBe(boarda)

    // re-prime queue with stale pid first, then active
    const tracking = memoryreadbookflags(
      mainbook,
      createtrackingid('withplayerboard'),
    )
    tracking.ids = [playera, playerb]
    mainbook!.activelist = mainbook!.activelist.filter((id) => id !== playera)

    const next = memorypicknextactiveplayerboard()
    expect(next?.id).toBe(boardb)
  })
})
