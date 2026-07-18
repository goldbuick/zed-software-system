/**
 * Evidence harness for orphaned player board copies (no fix).
 * Writes NDJSON to .cursor/debug-player-orphan.log
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { DEVICE } from 'zss/device'
import { boardrunnerlinkdead } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { handlelogout } from 'zss/device/vm/handlers/auth'
import { boardrunners, SECOND_TIMEOUT, tracking } from 'zss/device/vm/state'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
import {
  memorycreatebook,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryimportcodepagefromjson,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import {
  memorydebugcountplayerboards,
  memoryloginplayer,
  memorylogoutplayer,
  memorymoveplayertoboard,
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
  apilog: jest.fn(),
  boardrunnerlinkdead: jest.fn(),
  registerinspector: jest.fn(),
  registerloginready: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnermanagement', () => ({
  boardrunnerassignmentvalid: jest.fn(() => false),
  boardrunnerelect: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnerpushupdates', () => ({
  boardrunnerpushupdates: jest.fn(),
}))

jest.mock('zss/device/vm/gadgetsynctick', () => ({
  handlegadgetdesync: jest.fn(),
}))

const LOG_PATH = join(process.cwd(), '.cursor', 'debug-player-orphan.log')

function evidencelog(entry: Record<string, unknown>) {
  mkdirSync(join(process.cwd(), '.cursor'), { recursive: true })
  appendFileSync(
    LOG_PATH,
    `${JSON.stringify({ ...entry, timestamp: Date.now() })}\n`,
  )
}

function makeboardpage(name: string, pageid: string, extrastats = '') {
  const page = memoryimportcodepagefromjson({
    id: pageid,
    code: `@board ${name}\n${extrastats}`,
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

describe('player orphan evidence (no fix)', () => {
  const player = 'pid_orphan_evidence_1'
  const boarda = 'board-a-sid'
  const boardb = 'board-b-sid'
  const boardc = 'board-c-sid'

  beforeAll(() => {
    mkdirSync(join(process.cwd(), '.cursor'), { recursive: true })
    writeFileSync(LOG_PATH, '')
  })

  beforeEach(() => {
    memoryboundariesclear()
    const playerkind = memorycreatecodepage(`@${MEMORY_LABEL.PLAYER}\n`, {
      object: { name: MEMORY_LABEL.PLAYER },
    })
    const book = memorycreatebook([
      playerkind,
      makeboardpage('title', boarda, '@title\n'),
      makeboardpage('room-b', boardb),
      makeboardpage('room-c', boardc),
    ])
    book.name = 'main'
    memoryresetbooks([book])
    jest.clearAllMocks()
    for (const key of Object.keys(boardrunners)) {
      delete boardrunners[key]
    }
  })

  afterEach(() => {
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('R1: host move leaves at most one board copy (H1)', () => {
    const src = placeplayer(boarda, player, 5, 5)
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    memorywritebookplayerboard(mainbook, player, boarda)
    memorywritebookflag(mainbook, player, 'enterx', 5)
    memorywritebookflag(mainbook, player, 'entery', 5)

    const before = memorydebugcountplayerboards(player)
    const moved = memorymoveplayertoboard(mainbook, player, boardb, {
      x: 3,
      y: 3,
    })
    const after = memorydebugcountplayerboards(player)

    evidencelog({
      scenario: 'R1_move',
      hypothesis: 'H1',
      moved,
      sourceboardid: src.id,
      destboardid: boardb,
      before,
      after,
      sourcestillhasobject: !!src.objects[player],
      verdict:
        after.count > 1
          ? 'CONFIRMED_orphan'
          : moved
            ? 'REJECTED_host_move_clean'
            : 'INCONCLUSIVE_move_failed',
    })

    expect(moved).toBe(true)
    expect(after.count).toBeLessThanOrEqual(1)
  })

  it('R2: logout purges stranded copies on other boards (H2)', () => {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    placeplayer(boarda, player, 5, 5)
    placeplayer(boardc, player, 1, 1)
    memorywritebookplayerboard(mainbook, player, boarda)

    const before = memorydebugcountplayerboards(player)
    memorylogoutplayer(player)
    const after = memorydebugcountplayerboards(player)

    evidencelog({
      scenario: 'R2_logout_stranded',
      hypothesis: 'H2',
      before,
      after,
      verdict:
        after.count === 0 ? 'FIXED_logout_purges_all' : 'REGRESSION_orphan',
    })

    expect(before.count).toBe(2)
    expect(after.count).toBe(0)
  })

  it('R3: logout with no elected runner deletes on host (H3)', () => {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    placeplayer(boarda, player, 5, 5)
    memorywritebookplayerboard(mainbook, player, boarda)
    delete boardrunners[boarda]
    tracking[player] = SECOND_TIMEOUT

    const vm = { emit: jest.fn(), replynext: jest.fn() } as unknown as DEVICE
    const before = memorydebugcountplayerboards(player)
    handlelogout(vm, {
      session: '',
      player,
      id: 'm-logout',
      sender: '',
      target: 'logout',
      data: undefined,
    } as MESSAGE)
    const after = memorydebugcountplayerboards(player)

    evidencelog({
      scenario: 'R3_logout_no_runner',
      hypothesis: 'H3',
      before,
      after,
      linkdeadcalled: jest.mocked(boardrunnerlinkdead).mock.calls.length,
      trackingcleared: tracking[player] === undefined,
      verdict:
        after.count === 0 && tracking[player] === undefined
          ? 'FIXED_host_delete'
          : 'REGRESSION',
    })

    expect(boardrunnerlinkdead).not.toHaveBeenCalled()
    expect(after.count).toBe(0)
    expect(tracking[player]).toBeUndefined()
  })

  it('R3b: logout with no flags.board clears tracking (H3 loop)', () => {
    tracking[player] = SECOND_TIMEOUT
    const vm = { emit: jest.fn(), replynext: jest.fn() } as unknown as DEVICE
    handlelogout(vm, {
      session: '',
      player,
      id: 'm-logout-noboard',
      sender: '',
      target: 'logout',
      data: undefined,
    } as MESSAGE)

    evidencelog({
      scenario: 'R3b_logout_no_board',
      hypothesis: 'H3',
      trackingcleared: tracking[player] === undefined,
      verdict:
        tracking[player] === undefined
          ? 'FIXED_tracking_cleared'
          : 'REGRESSION_loop',
    })

    expect(tracking[player]).toBeUndefined()
    expect(boardrunnerlinkdead).not.toHaveBeenCalled()
  })

  it('R4: login with stranded copy can create second (H4)', () => {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    placeplayer(boardc, player, 1, 1)
    memorywritebookflag(mainbook, player, 'board', '')

    const before = memorydebugcountplayerboards(player)
    const ok = memoryloginplayer(player, {})
    const after = memorydebugcountplayerboards(player)

    evidencelog({
      scenario: 'R4_login_stranded',
      hypothesis: 'H4',
      ok,
      before,
      after,
      verdict:
        after.count > 1 ? 'CONFIRMED_login_duplicate' : 'REJECTED_no_duplicate',
    })

    expect(ok).toBe(true)
    expect(after.count).toBeGreaterThan(1)
  })
})
