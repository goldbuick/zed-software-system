jest.mock('zss/memory/playermanagement', () => ({
  memoryloginplayer: jest.fn(() => true),
  memoryreadplayerboard: jest.fn(() => ({ id: 'board1' })),
}))

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  boardrunnerlinkdead: jest.fn(),
  registerinspector: jest.fn(),
  registerloginready: jest.fn(),
}))

jest.mock('zss/device/vm/gadgetsynctick', () => ({
  handlegadgetdesync: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnerpushupdates', () => ({
  boardrunnerpushupdates: jest.fn(),
}))

jest.mock('zss/device/vm/playerchatroster', () => ({
  emitchatconnectplayer: jest.fn(),
  emitchatdisconnectplayer: jest.fn(),
  maybeemitplayerchatroster: jest.fn(),
}))

jest.mock('zss/memory/permissions', () => ({
  memoryistokenbanned: jest.fn(() => false),
  memorysetcommandpermissions: jest.fn(),
  memorysetplayertotoken: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryisoperator: jest.fn(() => false),
  memoryreadoperator: jest.fn(() => 'pid_operator'),
  memorywritehalt: jest.fn(),
}))

jest.mock('zss/memory/utilities', () => ({
  memoryreadconfig: jest.fn(),
  memorysetconfig: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnermanagement', () => ({
  boardrunnerassignmentvalid: jest.fn(() => true),
  boardrunnerelect: jest.fn(),
}))

import { DEVICE } from 'zss/device'
import { MESSAGE } from 'zss/device/api'
import { handlegadgetdesync } from 'zss/device/vm/gadgetsynctick'
import { handlelogin } from 'zss/device/vm/handlers/auth'
import {
  memoryloginplayer,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'

describe('handlelogin sticky flags', () => {
  const vm = {
    replynext: jest.fn(),
  } as unknown as DEVICE
  const player = 'pid_login_flags'

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(memoryloginplayer).mockReturnValue(true)
    jest
      .mocked(memoryreadplayerboard)
      .mockReturnValue({ id: 'board1' } as any)
  })

  it('does not merge terminal config keys into book flags', () => {
    const message: MESSAGE = {
      session: '',
      player,
      id: 'm-login-flags',
      sender: '',
      target: 'login',
      data: {
        user: 'Alice',
        crt: 'on',
        config: [['crt', 'off']],
        token: 'tok1',
      },
    }

    handlelogin(vm, message)

    expect(memoryloginplayer).toHaveBeenCalledWith(player, { user: 'Alice' })
    expect(vm.replynext).toHaveBeenCalledWith(message, 'acklogin', true)
    expect(handlegadgetdesync).toHaveBeenCalledWith(vm, message)
  })
})
