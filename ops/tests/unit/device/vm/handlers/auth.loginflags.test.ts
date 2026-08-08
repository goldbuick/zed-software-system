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
import type { MESSAGE } from 'zss/device/types'

describe('auth loginflags handler wiring', () => {
  it('loads auth module without deleted runner deps', () => {
    expect(() => require('zss/device/vm/handlers/auth')).not.toThrow()
    const { handlelogin } = require('zss/device/vm/handlers/auth')
    expect(typeof handlelogin).toBe('function')
    void ({} as DEVICE)
    void ({} as MESSAGE)
  })
})
