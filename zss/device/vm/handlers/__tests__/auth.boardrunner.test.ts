import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import { handlelogin, handlelogout } from 'zss/device/vm/handlers/auth'
import * as memorysync from 'zss/device/vm/memorysimsync'
import {
  ackboardrunners,
  boardrunners,
  skipboardrunners,
  tracking,
} from 'zss/device/vm/state'
import * as permissions from 'zss/memory/permissions'
import * as playermanagement from 'zss/memory/playermanagement'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
}))

jest.mock('zss/memory/permissions', () => ({
  memoryistokenbanned: jest.fn(() => false),
  memorysetcommandpermissions: jest.fn(),
  memorysetplayertotoken: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryisoperator: jest.fn(() => false),
  memoryreadoperator: jest.fn(() => 'op'),
  memorywritehalt: jest.fn(),
}))

jest.mock('zss/memory/utilities', () => ({
  memoryreadconfig: jest.fn(() => 'off'),
  memorysetconfig: jest.fn(),
}))

function clearvmrunner() {
  for (const k of Object.keys(boardrunners)) {
    delete boardrunners[k]
  }
  for (const k of Object.keys(ackboardrunners)) {
    delete ackboardrunners[k]
  }
  for (const k of Object.keys(skipboardrunners)) {
    delete skipboardrunners[k]
  }
  for (const k of Object.keys(tracking)) {
    delete tracking[k]
  }
}

describe('handlelogout board runner', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    clearvmrunner()
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(api, 'vmclearscroll').mockImplementation(() => {})
    jest.spyOn(api, 'bridgehalt').mockImplementation(() => {})
    jest.spyOn(api, 'apilog').mockImplementation(() => {})
    jest.spyOn(api, 'registerloginready').mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncdropplayerfromall')
      .mockImplementation(() => {})
    jest
      .spyOn(playermanagement, 'memorylogoutplayer')
      .mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncadmitboardrunner')
      .mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncrevokeboardrunner')
      .mockImplementation(() => {})
    jest.spyOn(memorysync, 'memorysyncpushdirty').mockImplementation(() => {})
    jest.spyOn(api, 'boardrunnerowned').mockImplementation(() => {})
  })

  afterEach(() => {
    clearvmrunner()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('revokes runner boards and re-elects remaining players', () => {
    boardrunners['board-x'] = 'leaver'
    boardrunners['board-y'] = 'leaver'
    ackboardrunners['board-x'] = 1
    ackboardrunners['board-y'] = 1
    tracking.leaver = 5
    tracking.stayer = 10
    jest
      .spyOn(playermanagement, 'memoryreadplayersfromboard')
      .mockImplementation((board: string) => {
        if (board === 'board-x') {
          return ['stayer']
        }
        if (board === 'board-y') {
          return ['stayer']
        }
        return []
      })

    const message = { player: 'leaver', data: false } as MESSAGE
    handlelogout(vm, message)

    expect(memorysync.memorysyncrevokeboardrunner).toHaveBeenCalledWith(
      'leaver',
      'board-x',
    )
    expect(memorysync.memorysyncrevokeboardrunner).toHaveBeenCalledWith(
      'leaver',
      'board-y',
    )
    expect(memorysync.memorysyncadmitboardrunner).toHaveBeenCalledWith(
      'stayer',
      'board-x',
    )
    expect(memorysync.memorysyncadmitboardrunner).toHaveBeenCalledWith(
      'stayer',
      'board-y',
    )
    expect(boardrunners['board-x']).toBe('stayer')
    expect(boardrunners['board-y']).toBe('stayer')
    expect(memorysync.memorysyncpushdirty).toHaveBeenCalled()
  })
})

describe('handlelogin board runner', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    clearvmrunner()
    jest.clearAllMocks()
    jest.spyOn(api, 'apilog').mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncensureloginreplstreams')
      .mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncadmitboardrunner')
      .mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncrevokeboardrunner')
      .mockImplementation(() => {})
    jest.spyOn(memorysync, 'memorysyncpushdirty').mockImplementation(() => {})
    jest.spyOn(api, 'boardrunnerowned').mockImplementation(() => {})
    jest.spyOn(permissions, 'memoryistokenbanned').mockReturnValue(false)
  })

  afterEach(() => {
    clearvmrunner()
    jest.restoreAllMocks()
  })

  it('revokes stale runner and elects joiner when board has no valid runner', () => {
    boardrunners['title-1'] = 'ghost'
    ackboardrunners['title-1'] = 1
    tracking.joiner = 8
    jest.spyOn(playermanagement, 'memoryloginplayer').mockReturnValue(true)
    jest.spyOn(playermanagement, 'memoryreadplayerboard').mockReturnValue({
      id: 'title-1',
    } as ReturnType<typeof playermanagement.memoryreadplayerboard>)
    jest
      .spyOn(playermanagement, 'memoryreadplayersfromboard')
      .mockReturnValue(['joiner'])

    const message = {
      player: 'joiner',
      data: {},
    } as MESSAGE
    const reply = jest.fn()
    vm.replynext = reply

    handlelogin(vm, message)

    expect(memorysync.memorysyncadmitboardrunner).toHaveBeenCalledWith(
      'joiner',
      'title-1',
    )
    expect(boardrunners['title-1']).toBe('joiner')
    expect(memorysync.memorysyncpushdirty).toHaveBeenCalled()
    expect(reply).toHaveBeenCalledWith(message, 'acklogin', true)
  })
})
