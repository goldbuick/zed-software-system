jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  boardrunnerlinkdead: jest.fn(),
  gadgetclientgotofade: jest.fn(),
  registerinspector: jest.fn(),
  registerloginready: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnerpushupdates', () => ({
  boardrunnerpushupdates: jest.fn(),
}))

jest.mock('zss/device/vm/playerchatroster', () => ({
  emitchatconnectplayer: jest.fn(),
  emitchatdisconnectplayer: jest.fn(),
  maybeemitplayerchatroster: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnermanagement', () => ({
  boardrunnerassignmentvalid: jest.fn(() => false),
  boardrunnerelect: jest.fn(),
}))

jest.mock('zss/memory/boards', () => ({
  memoryreadboardbyaddress: jest.fn(),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memorylogoutplayer: jest.fn(),
  memoryloginplayer: jest.fn(),
  memoryreadplayerboard: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryisoperator: jest.fn(() => false),
  memoryreadoperator: jest.fn(() => 'op'),
  memorywritehalt: jest.fn(),
}))

jest.mock('zss/memory/permissions', () => ({
  memoryistokenbanned: jest.fn(() => false),
  memorysetcommandpermissions: jest.fn(),
  memorysetplayertotoken: jest.fn(),
}))

jest.mock('zss/memory/utilities', () => ({
  memoryreadconfig: jest.fn(),
  memorysetconfig: jest.fn(),
}))

import type { DEVICE } from 'zss/device'
import { gadgetclientgotofade, registerloginready } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { handlelogout } from 'zss/device/vm/handlers/auth'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'

describe('handlelogout gotofade', () => {
  const vm = { emit: jest.fn() } as unknown as DEVICE

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('emits gotofade with resetorigin before loginready when no board', () => {
    jest.mocked(memoryreadplayerboard).mockReturnValue(undefined)

    handlelogout(vm, {
      player: 'pid_endgame',
      data: undefined,
    } as MESSAGE)

    expect(gadgetclientgotofade).toHaveBeenCalledWith(
      vm,
      'pid_endgame',
      true,
    )
    expect(registerloginready).toHaveBeenCalledWith(vm, 'pid_endgame')
    expect(gadgetclientgotofade.mock.invocationCallOrder[0]).toBeLessThan(
      registerloginready.mock.invocationCallOrder[0],
    )
  })
})
