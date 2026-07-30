import type { DEVICE } from 'zss/device'
import { handlechat } from 'zss/device/register/handlers/tape'
import { terminaladdlog } from 'zss/device/register/helpers/terminallog'
import type { MESSAGE } from 'zss/device/types'

jest.mock('zss/device/register/helpers/terminallog', () => ({
  terminaladdlog: jest.fn(),
}))

describe('handlechat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('always adds chat to the tape for a non-empty player id', () => {
    const message = {
      player: 'pid_speaker',
      target: 'chat',
      data: ['hello'],
    } as MESSAGE
    handlechat({} as DEVICE, message)
    expect(terminaladdlog).toHaveBeenCalledWith(message)
  })

  it('adds chat to the tape when player is empty', () => {
    const message = {
      player: '',
      target: 'chat',
      data: ['broadcast'],
    } as MESSAGE
    handlechat({} as DEVICE, message)
    expect(terminaladdlog).toHaveBeenCalledWith(message)
  })
})
