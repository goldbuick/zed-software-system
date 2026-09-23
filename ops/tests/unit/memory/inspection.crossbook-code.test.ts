/**
 * Inspect @code zssedit must key modem/editor to the book that owns the board
 * page, not always main — otherwise codewatch apply silently no-ops.
 */
import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import {
  handlecoderelease,
  handlecodewatch,
} from 'zss/device/vm/handlers/codewatch'
import { observers, watching } from 'zss/device/vm/state'
import { memorycreateboard } from 'zss/memory/boardlifecycle'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memoryinspectcommand } from 'zss/memory/inspection'
import {
  memoryloginplayer,
  memorywritebookplayerboard,
} from 'zss/memory/playermanagement'
import {
  memoryresetbooks,
  memorywritemainbook,
} from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

const registereditoropen = jest.fn()
const modemwriteinitstring = jest.fn()
const vmclearscroll = jest.fn()
const apierror = jest.fn(() => false)

jest.mock('zss/device/api', () => ({
  apierror: (...args: unknown[]) => apierror(...args),
  registercopy: jest.fn(),
  registereditoropen: (...args: unknown[]) => registereditoropen(...args),
  vmclearscroll: (...args: unknown[]) => vmclearscroll(...args),
  vmcodeaddress: (book: string, path: unknown) =>
    `${book}:${JSON.stringify(path)}`,
}))

jest.mock('zss/device/modem', () => ({
  modemdeletekeyswithprefix: jest.fn(),
  modemwriteinitstring: (...args: unknown[]) => modemwriteinitstring(...args),
  modemobservevaluestring: jest.fn(() => () => {}),
}))

describe('inspect element .code across books', () => {
  const vm = {} as DEVICE
  const host = 'pid_12_hostplayer01'
  const boardsid = 'sid_other_board_code'
  const objid = 'oid_obj_code_edit'

  afterEach(() => {
    memoryresetbooks([])
    registereditoropen.mockClear()
    modemwriteinitstring.mockClear()
    vmclearscroll.mockClear()
    apierror.mockClear()
    for (const key of Object.keys(watching)) {
      delete watching[key]
    }
    for (const key of Object.keys(observers)) {
      delete observers[key]
    }
  })

  function setupcrossbookobject() {
    const playerpage = memorycreatecodepage(`@${MEMORY_LABEL.PLAYER}\n`, {
      object: { name: MEMORY_LABEL.PLAYER },
    })
    const titlea = memorycreatecodepage(`@board ${MEMORY_LABEL.TITLE}\n`, {})
    const booka = memorycreatebook([playerpage, titlea])
    booka.name = 'mainbook'

    const titleb = memorycreatecodepage(`@board ${MEMORY_LABEL.TITLE}\n`, {})
    const room = memorycreateboard()
    room.id = boardsid
    const roompage = memorycreatecodepage('@board room\n', { board: room })
    roompage.id = boardsid
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

    dest.objects[objid] = {
      id: objid,
      kind: 'object',
      name: 'npc',
      x: 5,
      y: 5,
      code: '@npc\nold',
    }

    return { booka, bookb, dest }
  }

  it('opens editor keyed to the non-main book that owns the board', () => {
    const { booka, bookb } = setupcrossbookobject()

    memoryinspectcommand(`${objid}:code`, host)

    expect(apierror).not.toHaveBeenCalled()
    expect(modemwriteinitstring).toHaveBeenCalledWith(
      `${bookb.id}:${JSON.stringify([boardsid, objid])}`,
      '@npc\nold',
    )
    expect(registereditoropen).toHaveBeenCalledWith(
      expect.anything(),
      host,
      bookb.id,
      [boardsid, objid],
      'object',
      expect.stringContaining('otherbook'),
    )
    expect(registereditoropen.mock.calls[0][2]).not.toBe(booka.id)
  })

  it('codewatch release writes object.code when keyed to owning book', () => {
    const { bookb, dest } = setupcrossbookobject()
    const path = [boardsid, objid]

    function watchmsg(player: string): MESSAGE {
      return {
        session: '',
        player,
        id: 'id',
        sender: '',
        target: 'codewatch',
        data: [bookb.id, path],
      }
    }

    function releasemsg(player: string, code: string): MESSAGE {
      return {
        session: '',
        player,
        id: 'id',
        sender: '',
        target: 'coderelease',
        data: [bookb.id, path, code],
      }
    }

    handlecodewatch(vm, watchmsg(host))
    handlecoderelease(vm, releasemsg(host, '@npc\n#end'))

    expect(dest.objects[objid].code).toBe('@npc\n#end')
  })
})
