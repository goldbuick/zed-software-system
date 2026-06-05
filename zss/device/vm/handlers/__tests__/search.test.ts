import { DEVICE } from 'zss/device'
import { MESSAGE, registerloginready } from 'zss/device/api'
import { handlesearch } from 'zss/device/vm/handlers/auth'
import * as playermanagement from 'zss/memory/playermanagement'

jest.mock('zss/device/api', () => ({
  registerloginready: jest.fn(),
}))

describe('handlesearch', () => {
  const vm = {} as DEVICE
  const player = 'pid_search_test'

  afterEach(() => {
    jest.restoreAllMocks()
    jest.mocked(registerloginready).mockClear()
  })

  it('signals loginready when player is not active', () => {
    jest.spyOn(playermanagement, 'memoryreadplayeractive').mockReturnValue(false)

    const message: MESSAGE = {
      session: '',
      player,
      id: 'm1',
      sender: '',
      target: 'search',
      data: undefined,
    }

    handlesearch(vm, message)

    expect(registerloginready).toHaveBeenCalledWith(vm, player)
  })

  it('signals loginready when player is already active (reconnect/resync)', () => {
    jest.spyOn(playermanagement, 'memoryreadplayeractive').mockReturnValue(true)

    const message: MESSAGE = {
      session: '',
      player,
      id: 'm2',
      sender: '',
      target: 'search',
      data: undefined,
    }

    handlesearch(vm, message)

    expect(registerloginready).toHaveBeenCalledWith(vm, player)
  })
})
