const mocktermwrite = jest.fn()
const mockapilog = jest.fn()
const mockapierror = jest.fn()

jest.mock('zss/feature/wanix/wanixiframehost', () => ({
  sendwanixtermwrite: (...args: unknown[]) => mocktermwrite(...args),
}))

jest.mock('zss/feature/wanix/wanixsession', () => {
  const actual = jest.requireActual('zss/feature/wanix/wanixsession')
  return {
    ...actual,
    iswanixtermraw: jest.fn(() => false),
  }
})

jest.mock('zss/device/api', () => ({
  apierror: (...args: unknown[]) => mockapierror(...args),
  apilog: (...args: unknown[]) => mockapilog(...args),
}))

import { wanixhandletermwrite } from 'zss/feature/wanix/wanixdrop'

describe('wanixhandletermwrite', () => {
  const device = { emit: jest.fn() }
  const player = 'player1'

  beforeEach(() => {
    jest.clearAllMocks()
    mocktermwrite.mockResolvedValue(undefined)
  })

  it('echoes line to scrollback after successful term-write', async () => {
    await wanixhandletermwrite(device, player, 'hello')

    expect(mocktermwrite).toHaveBeenCalledWith('hello', { raw: false })
    expect(mockapilog).toHaveBeenCalledWith(device, player, 'hello')
    expect(mockapierror).not.toHaveBeenCalled()
  })

  it('replies pong when line is ping', async () => {
    await wanixhandletermwrite(device, player, 'ping')

    expect(mockapilog).toHaveBeenCalledWith(device, player, 'ping')
    expect(mockapilog).toHaveBeenCalledWith(device, player, 'pong')
  })

  it('does not echo when term-write fails', async () => {
    mocktermwrite.mockRejectedValue(new Error('no active task'))

    await wanixhandletermwrite(device, player, 'ping')

    expect(mockapierror).toHaveBeenCalledWith(
      device,
      player,
      'wanix',
      'no active task',
    )
    expect(mockapilog).not.toHaveBeenCalled()
  })
})
