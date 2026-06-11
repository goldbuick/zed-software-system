import { DEVICE } from 'zss/device'
import { MESSAGE } from 'zss/device/api'
import { handlegadgetdesync } from 'zss/device/vm/gadgetsynctick'
import { handlelogin } from 'zss/device/vm/handlers/auth'
import * as playermanagement from 'zss/memory/playermanagement'

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

jest.mock('../../boardrunnermanagement', () => ({
  boardrunnerassignmentvalid: jest.fn(() => true),
  boardrunnerelect: jest.fn(),
}))

describe('handlelogin gadget paint', () => {
  const vm = {
    replynext: jest.fn(),
  } as unknown as DEVICE
  const player = 'pid_gadget_test'

  const message: MESSAGE = {
    session: '',
    player,
    id: 'm1',
    sender: '',
    target: 'login',
    data: {},
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('forces gadget paint when reattaching an already-active player', () => {
    jest.spyOn(playermanagement, 'memoryreadplayeractive').mockReturnValue(true)
    jest.spyOn(playermanagement, 'memoryloginplayer').mockReturnValue(true)
    jest
      .spyOn(playermanagement, 'memoryreadplayerboard')
      .mockReturnValue({ id: 'board1' } as any)

    handlelogin(vm, message)

    expect(handlegadgetdesync).toHaveBeenCalledWith(vm, message)
    expect(vm.replynext).toHaveBeenCalledWith(message, 'acklogin', true)
  })

  it('forces gadget paint on first login', () => {
    jest
      .spyOn(playermanagement, 'memoryreadplayeractive')
      .mockReturnValue(false)
    jest.spyOn(playermanagement, 'memoryloginplayer').mockReturnValue(true)
    jest
      .spyOn(playermanagement, 'memoryreadplayerboard')
      .mockReturnValue({ id: 'board1' } as any)

    handlelogin(vm, message)

    expect(handlegadgetdesync).toHaveBeenCalledWith(vm, message)
    expect(vm.replynext).toHaveBeenCalledWith(message, 'acklogin', true)
  })
})
