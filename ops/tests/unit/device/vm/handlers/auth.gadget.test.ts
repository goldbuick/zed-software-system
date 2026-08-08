jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  gadgetclientgotofade: jest.fn(),
  registerinspector: jest.fn(),
  registerloginready: jest.fn(),
}))

jest.mock('zss/device/vm/playerchatroster', () => ({
  emitchatconnectplayer: jest.fn(),
  emitchatdisconnectplayer: jest.fn(),
  maybeemitplayerchatroster: jest.fn(),
}))

jest.mock('zss/device/vm/gadgetsynctick', () => ({
  handlegadgetdesync: jest.fn(),
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
import { handlegadgetdesync } from 'zss/device/vm/gadgetsynctick'
import { handlelogin } from 'zss/device/vm/handlers/auth'
import { memoryloginplayer } from 'zss/memory/playermanagement'

describe('handlelogin gadget desync', () => {
  const vm = { replynext: jest.fn() } as unknown as DEVICE

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(memoryloginplayer).mockReturnValue(true)
  })

  it('desyncs gadget after successful login', () => {
    handlelogin(vm, {
      player: 'pid_a',
      data: {},
    } as never)

    expect(handlegadgetdesync).toHaveBeenCalledWith(vm, expect.any(Object))
  })
})
